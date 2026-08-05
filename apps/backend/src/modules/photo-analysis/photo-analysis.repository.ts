import type { PhotoAnalysisJobStatus, PhotoAnalysisType } from '@shared/contracts/rental-space';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

/** 数据库中的待执行图片分析任务及其图片上下文。 */
export interface PhotoAnalysisJobRow extends RowDataPacket {
  id: string;
  photo_asset_id: string;
  analysis_type: PhotoAnalysisType;
  status: PhotoAnalysisJobStatus;
  provider: string;
  model_version: string;
  policy_version: string | null;
  reference_scope: string | null;
  attempt_count: number;
  file_url: string;
  mime_type: string;
}

/** 创建分析任务时固定厂商、模型和策略版本，便于后续审计与重跑。 */
export interface CreatePhotoAnalysisJobInput {
  photoAssetId: string;
  analysisType: PhotoAnalysisType;
  provider: string;
  modelVersion: string;
  policyVersion?: string;
  referenceScope?: string;
}

/** 创建单项图片分析任务，并同步将图片状态切换为处理中。 */
export async function createPhotoAnalysisJob(input: CreatePhotoAnalysisJobInput): Promise<string> {
  const id = generateId();
  await pool.execute(
    `INSERT INTO photo_analysis_jobs
      (id, photo_asset_id, analysis_type, status, provider, model_version, policy_version,
       reference_scope, attempt_count, created_at)
     VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, 0, NOW())`,
    [
      id,
      input.photoAssetId,
      input.analysisType,
      input.provider,
      input.modelVersion,
      input.policyVersion ?? null,
      input.referenceScope ?? null
    ]
  );
  if (input.analysisType === 'SAFETY') {
    await pool.execute("UPDATE photo_assets SET safety_status = 'PENDING', updated_at = NOW() WHERE id = ?", [
      input.photoAssetId
    ]);
  }
  if (input.analysisType === 'HOUSEHOLD_CONSISTENCY') {
    await pool.execute("UPDATE photo_assets SET household_status = 'PENDING', updated_at = NOW() WHERE id = ?", [
      input.photoAssetId
    ]);
  }
  return id;
}

/**
 * 原子抢占一批待处理任务。
 * SKIP LOCKED 允许多个 worker 并发消费而不会重复处理同一任务。
 */
export async function claimPhotoAnalysisJobs(limit = 5): Promise<PhotoAnalysisJobRow[]> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute<PhotoAnalysisJobRow[]>(
      `SELECT j.id, j.photo_asset_id, j.analysis_type, j.status, j.provider, j.model_version,
              j.policy_version, j.reference_scope, j.attempt_count, a.file_url, a.mime_type
       FROM photo_analysis_jobs j
       INNER JOIN photo_assets a ON a.id = j.photo_asset_id
       WHERE j.status = 'PENDING' AND (j.next_retry_at IS NULL OR j.next_retry_at <= NOW())
       ORDER BY j.created_at ASC
       LIMIT ${Math.max(1, Math.min(20, limit))}
       FOR UPDATE SKIP LOCKED`
    );
    if (rows.length > 0) {
      const placeholders = rows.map(() => '?').join(', ');
      await connection.execute(
        `UPDATE photo_analysis_jobs
         SET status = 'RUNNING', started_at = NOW(), attempt_count = attempt_count + 1
         WHERE id IN (${placeholders})`,
        rows.map((row) => row.id)
      );
    }
    await connection.commit();
    return rows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** 保存归一化结果，并按分析类型更新图片的公开业务状态。 */
export async function completePhotoAnalysisJob(
  job: PhotoAnalysisJobRow,
  result: { resultCode: string; riskLevel: string; signals: unknown; rawResult?: unknown }
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE photo_analysis_jobs
       SET status = 'SUCCEEDED', result_code = ?, risk_level = ?, signals = ?, provider_payload = ?,
           finished_at = NOW()
       WHERE id = ?`,
      [
        result.resultCode,
        result.riskLevel,
        JSON.stringify(result.signals),
        result.rawResult === undefined ? null : JSON.stringify(result.rawResult),
        job.id
      ]
    );
    if (job.analysis_type === 'SAFETY') {
      // 安全审核的中风险需要人工复核，高风险禁止公开。
      const status = result.riskLevel === 'HIGH' ? 'REJECTED' : result.riskLevel === 'MEDIUM' ? 'REVIEW' : 'PASSED';
      await connection.execute('UPDATE photo_assets SET safety_status = ?, updated_at = NOW() WHERE id = ?', [
        status,
        job.photo_asset_id
      ]);
    }
    if (job.analysis_type === 'HOUSEHOLD_CONSISTENCY') {
      // 家庭一致性仅形成风险信号，不直接给用户定性为虚假内容。
      const status =
        result.riskLevel === 'HIGH'
          ? 'SUSPICIOUS'
          : result.riskLevel === 'MEDIUM'
            ? 'INCONCLUSIVE'
            : 'CONSISTENT';
      await connection.execute('UPDATE photo_assets SET household_status = ?, updated_at = NOW() WHERE id = ?', [
        status,
        job.photo_asset_id
      ]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** 失败任务最多重试三次，最终失败后保留可解释的 FAILED 状态。 */
export async function failPhotoAnalysisJob(job: PhotoAnalysisJobRow): Promise<void> {
  const nextStatus = job.attempt_count + 1 >= 3 ? 'FAILED' : 'PENDING';
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE photo_analysis_jobs
     SET status = ?, next_retry_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE), finished_at = NOW()
     WHERE id = ?`,
    [nextStatus, job.id]
  );
  if (result.affectedRows === 0) return;
  if (nextStatus === 'FAILED' && job.analysis_type === 'SAFETY') {
    await pool.execute("UPDATE photo_assets SET safety_status = 'FAILED', updated_at = NOW() WHERE id = ?", [
      job.photo_asset_id
    ]);
  }
  if (nextStatus === 'FAILED' && job.analysis_type === 'HOUSEHOLD_CONSISTENCY') {
    await pool.execute("UPDATE photo_assets SET household_status = 'FAILED', updated_at = NOW() WHERE id = ?", [
      job.photo_asset_id
    ]);
  }
}

/** 查询同一草稿中的其他照片，作为家庭空间一致性模型的参考集。 */
export async function listHouseholdReferenceAssetIds(
  draftId: string,
  excludedAssetId: string
): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT p.photo_asset_id
     FROM rental_space_records r
     INNER JOIN rental_space_photos p ON p.space_record_id = r.id
     WHERE r.draft_id = ? AND p.photo_asset_id <> ?`,
    [draftId, excludedAssetId]
  );
  return rows.map((row) => String(row.photo_asset_id));
}
