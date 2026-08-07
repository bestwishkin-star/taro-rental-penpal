import type { RentalSnapshotSource } from '@shared/contracts/house-record';
import {
  HOUSE_MODULE_IDS,
  type HouseModuleId,
  type PhotoSafetyStatus,
  type RentalEventPeriod,
  type SpaceSceneAnswer
} from '@shared/contracts/rental-space';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

import { getSpacePromptConfig } from '../rentals/rental-space-prompts';
import type { SnapshotWriteInput, SnapshotWriteSpace } from './house-record.types';

/** 房屋实录公开侧使用的默认标题。 */
const DEFAULT_HOUSE_RECORD_TITLE = '一方屋檐下的生活实录';

/** 生成快照时读取的完整空间当前态。 */
interface SnapshotSourceSpaceRow extends RowDataPacket {
  id: string;
  module_type: HouseModuleId;
  prompt_version: string;
  scene_answers: string | SpaceSceneAnswer[] | null;
  event_text: string | null;
  event_voice_url: string | null;
  event_occurred_period: RentalEventPeriod | null;
}

/** 生成快照时允许复制的公开照片。 */
interface SnapshotSourcePhotoRow extends RowDataPacket {
  space_record_id: string;
  photo_asset_id: string;
  file_url: string;
  safety_status: PhotoSafetyStatus;
}

/** 房主可用于更新指定公开房屋的草稿关联。 */
interface OwnedSnapshotDraftRow extends RowDataPacket {
  id: string;
  updated_at: Date | string;
}

/** 已存在的同日快照主键。 */
interface ExistingSnapshotRow extends RowDataPacket {
  id: string;
}

/** 从当前空间记录生成公开快照的参数。 */
export interface ReplaceSnapshotFromDraftInput {
  draftId: string;
  rentalId: string;
  ownerOpenid: string;
  snapshotDate: string;
  source: RentalSnapshotSource;
}

/** 快照写入结果，完整度不足时不写入任何公开数据。 */
export type ReplaceSnapshotResult =
  | { status: 'WRITTEN'; snapshotId: string; snapshotDate: string }
  | { status: 'INCOMPLETE' };

/** 安全解析 MySQL JSON 答案，兼容字符串和驱动已解析数组。 */
function parseSceneAnswers(value: unknown): SpaceSceneAnswer[] {
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

/** 将稳定 promptId 答案转换为快照内可直接展示的观察文案。 */
function toObservations(module: HouseModuleId, answers: SpaceSceneAnswer[]) {
  const prompts = new Map(getSpacePromptConfig(module).prompts.map((prompt) => [prompt.id, prompt]));
  return answers.flatMap((answer) => {
    const prompt = prompts.get(answer.promptId);
    if (!prompt) return [];
    const answerValues: unknown[] = Array.isArray(answer.value) ? answer.value : [answer.value];
    const labels = prompt.options
      .filter((option) => answerValues.includes(option.value))
      .map((option) => option.label);
    return labels.length > 0 ? [{ label: prompt.title, value: labels.join('、') }] : [];
  });
}

/** 查询房主名下与公开房屋关联的最新编辑草稿。 */
export async function getOwnedSnapshotDraft(userOpenid: string, rentalId: string) {
  const [rows] = await pool.execute<OwnedSnapshotDraftRow[]>(
    `SELECT id, updated_at
     FROM rental_story_drafts
     WHERE user_openid = ? AND published_rental_id = ? AND status IN ('DRAFT', 'PUBLISHED')
     ORDER BY FIELD(status, 'DRAFT', 'PUBLISHED'), updated_at DESC
     LIMIT 1`,
    [userOpenid, rentalId]
  );
  const row = rows[0];
  return row ? { draftId: row.id, updatedAt: new Date(row.updated_at).toISOString() } : null;
}

/** 在当前连接中读取六空间当前态并组装不可变公开快照输入。 */
async function buildSnapshotInput(
  connection: PoolConnection,
  input: ReplaceSnapshotFromDraftInput
): Promise<SnapshotWriteInput | null> {
  const [records] = await connection.execute<SnapshotSourceSpaceRow[]>(
    `SELECT id, module_type, prompt_version, scene_answers, event_text, event_voice_url,
            event_occurred_period
     FROM rental_space_records
     WHERE draft_id = ? AND completed_at IS NOT NULL
     ORDER BY FIELD(module_type, 'kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood')`,
    [input.draftId]
  );
  if (new Set(records.map((record) => record.module_type)).size !== HOUSE_MODULE_IDS.length) return null;

  const [photos] = await connection.execute<SnapshotSourcePhotoRow[]>(
    `SELECT p.space_record_id, p.photo_asset_id, a.file_url, a.safety_status
     FROM rental_space_photos p
     INNER JOIN rental_space_records r ON r.id = p.space_record_id
     INNER JOIN photo_assets a ON a.id = p.photo_asset_id
     WHERE r.draft_id = ?
       AND p.visibility = 'PUBLIC'
       AND a.safety_status NOT IN ('REJECTED', 'REVIEW')
     ORDER BY p.created_at ASC`,
    [input.draftId]
  );
  const photosByRecord = new Map<string, SnapshotSourcePhotoRow[]>();
  for (const photo of photos) {
    const current = photosByRecord.get(photo.space_record_id) ?? [];
    current.push(photo);
    photosByRecord.set(photo.space_record_id, current);
  }

  const spaces: SnapshotWriteSpace[] = records.map((record) => {
    const answers = parseSceneAnswers(record.scene_answers);
    return {
      module: record.module_type,
      promptVersion: record.prompt_version,
      sceneAnswers: answers,
      observations: toObservations(record.module_type, answers),
      eventText: record.event_text,
      eventVoiceUrl: record.event_voice_url,
      eventOccurredPeriod: record.event_occurred_period,
      photos: (photosByRecord.get(record.id) ?? []).map((photo, index) => ({
        photoAssetId: photo.photo_asset_id,
        fileUrl: photo.file_url,
        sortOrder: index
      }))
    };
  });
  const eventTexts = spaces
    .map((space) => space.eventText?.trim())
    .filter((text): text is string => Boolean(text));
  const firstPhoto = spaces.flatMap((space) => space.photos)[0];
  return {
    rentalId: input.rentalId,
    ownerOpenid: input.ownerOpenid,
    snapshotDate: input.snapshotDate,
    source: input.source,
    title: DEFAULT_HOUSE_RECORD_TITLE,
    contentPreview: eventTexts.join('\n').slice(0, 500) || null,
    coverPhotoUrl: firstPhoto?.fileUrl ?? null,
    records: spaces
  };
}

/** 在同一事务中覆盖主表并重建空间、照片子项。 */
async function replaceSnapshotWithConnection(connection: PoolConnection, input: SnapshotWriteInput) {
  const [existingRows] = await connection.execute<ExistingSnapshotRow[]>(
    `SELECT id FROM rental_public_snapshots
     WHERE rental_id = ? AND snapshot_date = ?
     FOR UPDATE`,
    [input.rentalId, input.snapshotDate]
  );
  const snapshotId = existingRows[0]?.id ?? generateId();

  if (existingRows.length > 0) {
    await connection.execute(
      `UPDATE rental_public_snapshots
       SET owner_openid = ?, source = ?, title = ?, content_preview = ?, cover_photo_url = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        input.ownerOpenid,
        input.source,
        input.title,
        input.contentPreview,
        input.coverPhotoUrl,
        snapshotId
      ]
    );
  } else {
    await connection.execute(
      `INSERT INTO rental_public_snapshots
        (id, rental_id, owner_openid, snapshot_date, source, title, content_preview, cover_photo_url,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        snapshotId,
        input.rentalId,
        input.ownerOpenid,
        input.snapshotDate,
        input.source,
        input.title,
        input.contentPreview,
        input.coverPhotoUrl
      ]
    );
  }

  // 同日覆盖必须先删照片再删空间，避免历史子项残留到新版本。
  await connection.execute(
    `DELETE p FROM rental_public_snapshot_photos p
     INNER JOIN rental_public_snapshot_spaces s ON s.id = p.snapshot_space_id
     WHERE s.snapshot_id = ?`,
    [snapshotId]
  );
  await connection.execute('DELETE FROM rental_public_snapshot_spaces WHERE snapshot_id = ?', [snapshotId]);

  for (const record of input.records) {
    const snapshotSpaceId = generateId();
    await connection.execute(
      `INSERT INTO rental_public_snapshot_spaces
        (id, snapshot_id, module_type, prompt_version, scene_answers, observations, event_text,
         event_voice_url, event_occurred_period, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        snapshotSpaceId,
        snapshotId,
        record.module,
        record.promptVersion,
        JSON.stringify(record.sceneAnswers),
        JSON.stringify(record.observations),
        record.eventText,
        record.eventVoiceUrl,
        record.eventOccurredPeriod
      ]
    );
    for (const photo of record.photos) {
      await connection.execute(
        `INSERT INTO rental_public_snapshot_photos
          (id, snapshot_space_id, photo_asset_id, file_url, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [generateId(), snapshotSpaceId, photo.photoAssetId, photo.fileUrl, photo.sortOrder]
      );
    }
  }
  return snapshotId;
}

/** 复用调用方事务生成快照，供首次发布保证整体原子性。 */
export async function replaceSnapshotFromDraftWithConnection(
  connection: PoolConnection,
  input: ReplaceSnapshotFromDraftInput
): Promise<ReplaceSnapshotResult> {
  const snapshotInput = await buildSnapshotInput(connection, input);
  if (!snapshotInput) return { status: 'INCOMPLETE' };
  const snapshotId = await replaceSnapshotWithConnection(connection, snapshotInput);
  return { status: 'WRITTEN', snapshotId, snapshotDate: input.snapshotDate };
}

/** 自行管理事务，将房主当前态发布为当天公开快照。 */
export async function replaceSnapshotFromDraft(
  input: ReplaceSnapshotFromDraftInput
): Promise<ReplaceSnapshotResult> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await replaceSnapshotFromDraftWithConnection(connection, input);
    if (result.status === 'INCOMPLETE') {
      await connection.rollback();
      return result;
    }
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
