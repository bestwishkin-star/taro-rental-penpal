import {
  HOUSE_MODULE_IDS,
  type EvidenceVisibility,
  type HouseModuleId,
  type PhotoHouseholdStatus,
  type PhotoSafetyStatus,
  type RentalDraftStatus,
  type RentalEventPeriod,
  type SpaceSceneAnswer
} from '@shared/contracts/rental-space';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';
import { getShanghaiDate } from '@/modules/house-records/house-record-date';
import { ensureHouseRecordSnapshotSchema } from '@/modules/house-records/house-record-schema';
import { replaceSnapshotFromDraftWithConnection } from '@/modules/house-records/house-record-snapshot.repository';

/** 服务端草稿主表行。 */
export interface RentalDraftRow extends RowDataPacket {
  id: string;
  user_openid: string;
  status: RentalDraftStatus;
  published_rental_id: string | null;
  updated_at: Date | string;
}

/** 空间记录及其照片数量聚合行。 */
export interface RentalDraftRecordRow extends RowDataPacket {
  id: string;
  module_type: HouseModuleId;
  prompt_version: string;
  scene_answers: string | SpaceSceneAnswer[] | null;
  event_text: string | null;
  event_voice_url: string | null;
  event_occurred_period: RentalEventPeriod | null;
  is_slice_confirmed: number;
  completed_at: Date | string | null;
  updated_at: Date | string;
  photo_count: number;
}

/** 草稿所有者读取的空间照片行。 */
export interface RentalSpacePhotoRow extends RowDataPacket {
  id: string;
  photo_asset_id: string;
  file_url: string;
  visibility: EvidenceVisibility;
  captured_at: Date | string | null;
  safety_status: PhotoSafetyStatus;
  household_status: PhotoHouseholdStatus;
}

/** 空间记录全量写入参数，service 负责合并 PATCH 未提供的字段。 */
export interface UpsertRentalSpaceRecordData {
  draftId: string;
  module: HouseModuleId;
  promptVersion: string;
  sceneAnswers: SpaceSceneAnswer[];
  eventText: string | null;
  eventVoiceUrl: string | null;
  eventOccurredPeriod: RentalEventPeriod | null;
  isSliceConfirmed: boolean;
}

/**
 * 在调用方事务内创建关联既有房屋的可编辑修订草稿。
 * 空间和照片使用新主键复制，历史快照及首次发布草稿保持不可变。
 */
async function createRevisionDraftWithConnection(
  connection: PoolConnection,
  sourceDraftId: string,
  rentalId: string,
  userOpenid: string
): Promise<RentalDraftRow> {
  const [existingRows] = await connection.execute<RentalDraftRow[]>(
    `SELECT id, user_openid, status, published_rental_id, updated_at
     FROM rental_story_drafts
     WHERE user_openid = ? AND status = 'DRAFT' AND published_rental_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userOpenid, rentalId]
  );
  if (existingRows[0]) return existingRows[0];

  const revisionId = generateId();
  await connection.execute(
    `INSERT INTO rental_story_drafts
      (id, user_openid, status, published_rental_id, created_at, updated_at)
     VALUES (?, ?, 'DRAFT', ?, NOW(), NOW())`,
    [revisionId, userOpenid, rentalId]
  );

  // 按模块复制当前六空间，新的记录主键避免修改首次发布草稿。
  await connection.execute(
    `INSERT INTO rental_space_records
      (id, draft_id, module_type, prompt_version, scene_answers, event_text, event_voice_url,
       event_occurred_period, is_slice_confirmed, completed_at, created_at, updated_at)
     SELECT UUID(), ?, module_type, prompt_version, scene_answers, event_text, event_voice_url,
            event_occurred_period, is_slice_confirmed, completed_at, NOW(), NOW()
     FROM rental_space_records
     WHERE draft_id = ?`,
    [revisionId, sourceDraftId]
  );

  // 只复制照片绑定和可见性，不复用已经消费的一次性拍摄挑战。
  await connection.execute(
    `INSERT INTO rental_space_photos
      (id, space_record_id, photo_asset_id, visibility, capture_challenge_id, captured_at, created_at)
     SELECT UUID(), target_record.id, photo.photo_asset_id, photo.visibility, NULL, photo.captured_at, NOW()
     FROM rental_space_records source_record
     INNER JOIN rental_space_records target_record
       ON target_record.draft_id = ? AND target_record.module_type = source_record.module_type
     INNER JOIN rental_space_photos photo ON photo.space_record_id = source_record.id
     WHERE source_record.draft_id = ?`,
    [revisionId, sourceDraftId]
  );

  return {
    id: revisionId,
    user_openid: userOpenid,
    status: 'DRAFT',
    published_rental_id: rentalId,
    updated_at: new Date()
  } as RentalDraftRow;
}

/** 在指定连接中读取当前草稿，用于用户行锁保护下的幂等创建。 */
async function findCurrentDraft(connection: PoolConnection, userOpenid: string): Promise<RentalDraftRow | null> {
  const [rows] = await connection.execute<RentalDraftRow[]>(
    `SELECT id, user_openid, status, published_rental_id, updated_at
     FROM rental_story_drafts
     WHERE user_openid = ? AND status = 'DRAFT'
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userOpenid]
  );
  return rows[0] ?? null;
}

/**
 * 幂等获取或创建当前草稿。
 * 通过锁定 users 行串行化同一用户的并发请求，避免产生多个 DRAFT。
 */
export async function getOrCreateRentalDraft(userOpenid: string): Promise<RentalDraftRow> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // 登录用户行作为草稿创建锁，不引入额外分布式锁依赖。
    await connection.execute('SELECT openid FROM users WHERE openid = ? FOR UPDATE', [userOpenid]);

    const existing = await findCurrentDraft(connection, userOpenid);
    if (existing) {
      await connection.commit();
      return existing;
    }

    const [publishedRows] = await connection.execute<RentalDraftRow[]>(
      `SELECT id, user_openid, status, published_rental_id, updated_at
       FROM rental_story_drafts
       WHERE user_openid = ? AND status = 'PUBLISHED' AND published_rental_id IS NOT NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userOpenid]
    );
    const published = publishedRows[0];
    if (published?.published_rental_id) {
      const revision = await createRevisionDraftWithConnection(
        connection,
        published.id,
        published.published_rental_id,
        userOpenid
      );
      await connection.commit();
      return revision;
    }

    const id = generateId();
    await connection.execute(
      `INSERT INTO rental_story_drafts (id, user_openid, status, created_at, updated_at)
       VALUES (?, ?, 'DRAFT', NOW(), NOW())`,
      [id, userOpenid]
    );
    await connection.commit();
    return {
      id,
      user_openid: userOpenid,
      status: 'DRAFT',
      published_rental_id: null,
      updated_at: new Date()
    } as RentalDraftRow;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** 读取用户当前未发布草稿，不产生写操作。 */
export async function getCurrentRentalDraft(userOpenid: string): Promise<RentalDraftRow | null> {
  const [rows] = await pool.execute<RentalDraftRow[]>(
    `SELECT id, user_openid, status, published_rental_id, updated_at
     FROM rental_story_drafts
     WHERE user_openid = ? AND status = 'DRAFT'
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userOpenid]
  );
  return rows[0] ?? null;
}

/** 同时按草稿 ID 和 openid 校验资源所有权。 */
export async function getOwnedRentalDraft(draftId: string, userOpenid: string): Promise<RentalDraftRow | null> {
  const [rows] = await pool.execute<RentalDraftRow[]>(
    `SELECT id, user_openid, status, published_rental_id, updated_at
     FROM rental_story_drafts
     WHERE id = ? AND user_openid = ?`,
    [draftId, userOpenid]
  );
  return rows[0] ?? null;
}

/** 列出草稿下全部点位，并聚合每个点位的照片数量。 */
export async function listRentalDraftRecords(draftId: string): Promise<RentalDraftRecordRow[]> {
  const [rows] = await pool.execute<RentalDraftRecordRow[]>(
    `SELECT r.id, r.module_type, r.prompt_version, r.scene_answers, r.event_text, r.event_voice_url,
            r.event_occurred_period,
            r.is_slice_confirmed, r.completed_at, r.updated_at, COUNT(p.id) AS photo_count
     FROM rental_space_records r
     LEFT JOIN rental_space_photos p ON p.space_record_id = r.id
     WHERE r.draft_id = ?
     GROUP BY r.id, r.module_type, r.prompt_version, r.scene_answers, r.event_text, r.event_voice_url,
              r.event_occurred_period,
              r.is_slice_confirmed, r.completed_at, r.updated_at`,
    [draftId]
  );
  return rows;
}

/** 读取一个空间点位及其照片计数。 */
export async function getRentalSpaceRecord(
  draftId: string,
  module: HouseModuleId
): Promise<RentalDraftRecordRow | null> {
  const [rows] = await pool.execute<RentalDraftRecordRow[]>(
    `SELECT r.id, r.module_type, r.prompt_version, r.scene_answers, r.event_text, r.event_voice_url,
            r.event_occurred_period, r.is_slice_confirmed, r.completed_at, r.updated_at,
            COUNT(p.id) AS photo_count
     FROM rental_space_records r
     LEFT JOIN rental_space_photos p ON p.space_record_id = r.id
     WHERE r.draft_id = ? AND r.module_type = ?
     GROUP BY r.id, r.module_type, r.prompt_version, r.scene_answers, r.event_text, r.event_voice_url,
              r.event_occurred_period, r.is_slice_confirmed, r.completed_at, r.updated_at`,
    [draftId, module]
  );
  return rows[0] ?? null;
}

/** 创建或覆盖一个点位记录，并同步刷新草稿更新时间。 */
export async function upsertRentalSpaceRecord(input: UpsertRentalSpaceRecordData): Promise<string> {
  const existing = await getRentalSpaceRecord(input.draftId, input.module);
  const id = existing?.id ?? generateId();
  await pool.execute(
    `INSERT INTO rental_space_records
      (id, draft_id, module_type, prompt_version, scene_answers, event_text, event_voice_url,
       event_occurred_period, is_slice_confirmed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       prompt_version = VALUES(prompt_version),
       scene_answers = VALUES(scene_answers),
       event_text = VALUES(event_text),
       event_voice_url = VALUES(event_voice_url),
       event_occurred_period = VALUES(event_occurred_period),
       is_slice_confirmed = VALUES(is_slice_confirmed),
       updated_at = NOW()`,
    [
      id,
      input.draftId,
      input.module,
      input.promptVersion,
      JSON.stringify(input.sceneAnswers),
      input.eventText,
      input.eventVoiceUrl,
      input.eventOccurredPeriod,
      input.isSliceConfirmed ? 1 : 0
    ]
  );
  await pool.execute('UPDATE rental_story_drafts SET updated_at = NOW() WHERE id = ?', [input.draftId]);
  return id;
}

/** 读取草稿所有者可见的全部照片，包括仅核验照片。 */
export async function listRentalSpacePhotos(recordId: string): Promise<RentalSpacePhotoRow[]> {
  const [rows] = await pool.execute<RentalSpacePhotoRow[]>(
    `SELECT p.id, p.photo_asset_id, a.file_url, p.visibility, p.captured_at,
            a.safety_status, a.household_status
     FROM rental_space_photos p
     INNER JOIN photo_assets a ON a.id = p.photo_asset_id
     WHERE p.space_record_id = ?
     ORDER BY p.created_at ASC`,
    [recordId]
  );
  return rows;
}

/** 将已有图片资产绑定到空间记录；重复绑定只更新可见性和拍摄时间。 */
export async function attachRentalSpacePhoto(
  recordId: string,
  photoAssetId: string,
  visibility: EvidenceVisibility,
  captureChallengeId?: string,
  capturedAt?: Date
): Promise<void> {
  await pool.execute(
    `INSERT INTO rental_space_photos
      (id, space_record_id, photo_asset_id, visibility, capture_challenge_id, captured_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE visibility = VALUES(visibility), captured_at = VALUES(captured_at)`,
    [generateId(), recordId, photoAssetId, visibility, captureChallengeId ?? null, capturedAt ?? null]
  );
}

/** 检查完全相同的图片内容是否已用于当前草稿的其他点位。 */
export async function isPhotoContentUsedInDraft(
  draftId: string,
  contentHash: string,
  excludedAssetId: string
): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1
     FROM rental_space_records r
     INNER JOIN rental_space_photos p ON p.space_record_id = r.id
     INNER JOIN photo_assets a ON a.id = p.photo_asset_id
     WHERE r.draft_id = ? AND a.content_hash = ? AND a.id <> ?
     LIMIT 1`,
    [draftId, contentHash, excludedAssetId]
  );
  return rows.length > 0;
}

/** 修改空间照片的社区可见性。 */
export async function updateRentalSpacePhotoVisibility(
  recordId: string,
  photoId: string,
  visibility: EvidenceVisibility
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE rental_space_photos SET visibility = ? WHERE id = ? AND space_record_id = ?',
    [visibility, photoId, recordId]
  );
  return result.affectedRows > 0;
}

/** 删除属于指定空间记录的照片绑定关系。 */
export async function deleteRentalSpacePhoto(recordId: string, photoId: string): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM rental_space_photos WHERE id = ? AND space_record_id = ?',
    [photoId, recordId]
  );
  return result.affectedRows > 0;
}

/**
 * 在数据库中重新计算点位完成状态。
 * 完成必须同时满足照片、三项回答、具体经历和切片确认，前端不能提交完成百分比。
 */
export async function refreshRentalSpaceRecordCompletion(recordId: string): Promise<void> {
  await pool.execute(
    `UPDATE rental_space_records r
     SET r.completed_at = CASE
       WHEN r.is_slice_confirmed = 1
        AND JSON_LENGTH(COALESCE(r.scene_answers, JSON_ARRAY())) >= 3
        AND (CHAR_LENGTH(TRIM(COALESCE(r.event_text, ''))) >= 20 OR TRIM(COALESCE(r.event_voice_url, '')) <> '')
        AND EXISTS (SELECT 1 FROM rental_space_photos p WHERE p.space_record_id = r.id)
       THEN COALESCE(r.completed_at, NOW())
       ELSE NULL
     END,
     r.updated_at = NOW()
     WHERE r.id = ?`,
    [recordId]
  );
}

/** 草稿事务发布可能产生的三种业务结果。 */
export type PublishDraftResult =
  | { status: 'PUBLISHED'; rentalId: string }
  | { status: 'INCOMPLETE' }
  | { status: 'UNSAFE_PHOTOS' };

/** 发布事务中用于聚合正文的点位字段。 */
interface PublishRecordRow extends RowDataPacket {
  module_type: HouseModuleId;
  event_text: string | null;
}

/** 发布事务中用于安全门禁和封面聚合的公开照片字段。 */
interface PublishPhotoRow extends RowDataPacket {
  file_url: string;
  safety_status: PhotoSafetyStatus;
}

/** 首次发布屋檐故事时写入 rentals 的完整数据。 */
interface PublishedRentalInsertInput {
  rentalId: string;
  userOpenid: string;
  experience: string;
  photoUrls: string[];
}

/** 可根据旧数据库实际结构选择写入的租房字段。 */
interface CompatibleRentalField {
  column: string;
  value: string | number;
}

/**
 * 在当前事务中兼容新旧 rentals 表创建屋檐故事。
 * 部署迁移尚未执行时跳过新增列，避免首次发布被数据库结构漂移阻断。
 */
async function insertPublishedRentalWithConnection(
  connection: PoolConnection,
  input: PublishedRentalInsertInput
): Promise<void> {
  const [columnRows] = await connection.execute<RowDataPacket[]>('SHOW COLUMNS FROM rentals');
  const existingColumns = new Set(columnRows.map((row) => String(row.Field)));
  const columns = ['id', 'user_openid'];
  const placeholders = ['?', '?'];
  const values: Array<string | number> = [input.rentalId, input.userOpenid];

  /** 按当前表真实存在的列追加首次发布数据。 */
  const compatibleFields: CompatibleRentalField[] = [
    { column: 'title', value: '一方屋檐下的生活切片' },
    { column: 'price', value: '' },
    { column: 'location', value: '屋檐故事' },
    { column: 'room_type', value: '屋檐故事' },
    { column: 'area', value: '' },
    { column: 'experience', value: input.experience },
    { column: 'wechat', value: '' },
    { column: 'photos', value: JSON.stringify(input.photoUrls) },
    { column: 'proof_status', value: 'none' },
    { column: 'post_status', value: 'active' },
    { column: 'status', value: 1 }
  ];
  for (const field of compatibleFields) {
    if (!existingColumns.has(field.column)) continue;
    columns.push(field.column);
    placeholders.push('?');
    values.push(field.value);
  }

  // 时间字段由数据库生成，兼容更早没有审计时间列的表结构。
  for (const timestampColumn of ['created_at', 'updated_at']) {
    if (!existingColumns.has(timestampColumn)) continue;
    columns.push(timestampColumn);
    placeholders.push('NOW()');
  }

  const sql =
    'INSERT INTO rentals (' + columns.join(', ') + ') VALUES (' + placeholders.join(', ') + ')';
  await connection.execute(sql, values);
}

/**
 * 在单一事务内校验六点并生成公开故事。
 * 重复发布返回既有 rentalId，避免用户连点产生重复内容。
 */
export async function publishRentalDraftTransaction(
  draftId: string,
  userOpenid: string,
  enforceSafety: boolean
): Promise<PublishDraftResult> {
  await ensureHouseRecordSnapshotSchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [draftRows] = await connection.execute<RentalDraftRow[]>(
      `SELECT id, user_openid, status, published_rental_id, updated_at
       FROM rental_story_drafts
       WHERE id = ? AND user_openid = ?
       FOR UPDATE`,
      [draftId, userOpenid]
    );
    const draft = draftRows[0];
    if (!draft) {
      await connection.rollback();
      return { status: 'INCOMPLETE' };
    }
    if (draft.status === 'PUBLISHED' && draft.published_rental_id) {
      await createRevisionDraftWithConnection(
        connection,
        draft.id,
        draft.published_rental_id,
        userOpenid
      );
      await connection.commit();
      return { status: 'PUBLISHED', rentalId: draft.published_rental_id };
    }
    if (draft.status === 'DRAFT' && draft.published_rental_id) {
      await connection.commit();
      return { status: 'PUBLISHED', rentalId: draft.published_rental_id };
    }
    if (draft.status !== 'DRAFT') {
      await connection.rollback();
      return { status: 'INCOMPLETE' };
    }

    // 锁定草稿后再次从数据库校验六个点位，不能信任页面上的 100%。
    const [records] = await connection.execute<PublishRecordRow[]>(
      `SELECT r.module_type, r.event_text
       FROM rental_space_records r
       WHERE r.draft_id = ?
         AND r.completed_at IS NOT NULL
         AND EXISTS (SELECT 1 FROM rental_space_photos p WHERE p.space_record_id = r.id)`,
      [draftId]
    );
    if (new Set(records.map((record) => record.module_type)).size !== 6) {
      await connection.rollback();
      return { status: 'INCOMPLETE' };
    }

    // 仅公开照片进入故事聚合；核验专用照片始终留在私密数据表。
    const [publicPhotos] = await connection.execute<PublishPhotoRow[]>(
      `SELECT a.file_url, a.safety_status
       FROM rental_space_photos p
       INNER JOIN rental_space_records r ON r.id = p.space_record_id
       INNER JOIN photo_assets a ON a.id = p.photo_asset_id
       WHERE r.draft_id = ? AND p.visibility = 'PUBLIC'
       ORDER BY p.created_at ASC`,
      [draftId]
    );
    const hasRejectedPhoto = publicPhotos.some(
      (photo) =>
        photo.safety_status === 'REJECTED' ||
        photo.safety_status === 'REVIEW' ||
        (enforceSafety && photo.safety_status !== 'PASSED')
    );
    if (hasRejectedPhoto) {
      await connection.rollback();
      return { status: 'UNSAFE_PHOTOS' };
    }

    const rentalId = generateId();
    const moduleOrder = new Map(HOUSE_MODULE_IDS.map((module, index) => [module, index]));
    const experience = records
      .sort((a, b) => (moduleOrder.get(a.module_type) ?? 0) - (moduleOrder.get(b.module_type) ?? 0))
      .map((record) => record.event_text?.trim())
      .filter((text): text is string => Boolean(text))
      .join('\n\n');
    const photoUrls = publicPhotos.map((photo) => photo.file_url);

    // 故事创建和草稿状态切换必须同时成功或同时回滚。
    await insertPublishedRentalWithConnection(connection, {
      rentalId,
      userOpenid,
      experience,
      photoUrls
    });
    await connection.execute(
      `UPDATE rental_story_drafts
       SET status = 'PUBLISHED', published_rental_id = ?, published_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [rentalId, draftId]
    );
    // 首次公开快照与租房主体必须同事务提交，避免发现页出现没有时间线的房屋。
    const snapshot = await replaceSnapshotFromDraftWithConnection(connection, {
      draftId,
      rentalId,
      ownerOpenid: userOpenid,
      snapshotDate: getShanghaiDate(),
      source: 'SYSTEM'
    });
    if (snapshot.status === 'INCOMPLETE') {
      throw new Error('首次发布快照缺少完整空间记录');
    }
    await createRevisionDraftWithConnection(connection, draftId, rentalId, userOpenid);
    await connection.commit();
    return { status: 'PUBLISHED', rentalId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** 安全解析 MySQL JSON 场景答案，兼容驱动返回 JSON 字符串或已解析数组。 */
export function parseSceneAnswers(value: unknown): SpaceSceneAnswer[] {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (answer): answer is SpaceSceneAnswer =>
        typeof answer === 'object' &&
        answer !== null &&
        typeof (answer as SpaceSceneAnswer).promptId === 'string' &&
        'value' in answer
    );
  } catch {
    return [];
  }
}
