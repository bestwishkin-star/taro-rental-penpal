import type { RentalSnapshotSource } from '@shared/contracts/house-record';
import type {
  HouseModuleId,
  RentalEventPeriod,
  RentalTrustEvidence,
  RentalTrustLabel,
  SpaceSceneAnswer
} from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { summarizeRentalCheckins } from '@/modules/rentals/rental-checkin.repository';
import { ensureRentalTrustSchema } from '@/modules/rentals/rental-trust-schema';

import { ensureHouseRecordSnapshotSchema } from './house-record-schema';
import type { HouseRecordDateRange } from './house-record.types';

/** 发现列表使用的归一化分页参数。 */
export interface HouseRecordListQuery {
  keyword?: string;
  page: number;
  pageSize: number;
}

/** 发现列表最新快照数据库行。 */
interface ListingRow extends RowDataPacket {
  rental_id: string;
  title: string | null;
  content_preview: string | null;
  cover_photo_url: string | null;
  nickname: string;
  avatar_url: string;
  snapshot_date: string;
  updated_at: Date | string;
}

/** 计数、打卡和可信标识查询共用的数据库行。 */
interface AggregateRow extends RowDataPacket {
  rental_id: string;
  total?: number | string;
  period?: RentalEventPeriod;
  captured_at?: Date | string;
}

/** 成长树页头使用的公开作者摘要行。 */
interface SummaryRow extends RowDataPacket {
  rental_id: string;
  title: string | null;
  nickname: string;
  avatar_url: string;
}

/** 时间线快照主表数据库行。 */
interface TimelineRow extends RowDataPacket {
  id: string;
  snapshot_date: string;
  source: RentalSnapshotSource;
  content_preview: string | null;
  cover_photo_url: string | null;
}

/** 快照与空间模块的关联行。 */
interface ModuleRow extends RowDataPacket {
  snapshot_id: string;
  module_type: HouseModuleId;
}

/** 指定日期公开快照主表行。 */
interface HeaderRow extends RowDataPacket {
  id: string;
  rental_id: string;
  snapshot_date: string;
  source: RentalSnapshotSource;
}

/** 指定日期固化空间内容行。 */
interface SpaceRow extends RowDataPacket {
  id: string;
  module_type: HouseModuleId;
  scene_answers: string | SpaceSceneAnswer[] | null;
  observations: string | Array<{ label: string; value: string }> | null;
  event_text: string | null;
  event_voice_url: string | null;
  event_occurred_period: RentalEventPeriod | null;
}

/** 快照空间公开照片行。 */
interface PhotoRow extends RowDataPacket {
  snapshot_space_id: string;
  file_url: string;
}

/** 房主所有权与房屋公开状态行。 */
interface OwnerRow extends RowDataPacket {
  user_openid: string;
  status: number;
  post_status: string | null;
}

/** 当前草稿和最后快照更新时间行。 */
interface OwnerStatusRow extends RowDataPacket {
  current_updated_at: Date | string;
  latest_snapshot_date: string | null;
  latest_snapshot_updated_at: Date | string | null;
}

/** 将数据库时间转换为接口使用的 ISO 字符串。 */
function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

/** 安全解析快照 JSON 数组，异常历史值降级为空数组。 */
function parseArray<T>(value: string | T[] | null): T[] {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** 生成参数化 IN 查询的占位符。 */
function marks(values: readonly string[]): string {
  return values.map(() => '?').join(', ');
}

/** 查询发现页每套活动房屋的最新公开快照。 */
export async function listLatestPublicSnapshots(query: HouseRecordListQuery) {
  await ensureHouseRecordSnapshotSchema();
  const keyword = query.keyword?.trim();
  const keywordSql = keyword
    ? 'AND (s.title LIKE ? OR s.content_preview LIKE ? OR u.nickname LIKE ?)'
    : '';
  const params: Array<string | number> = [];
  if (keyword) {
    const pattern = '%' + keyword + '%';
    params.push(pattern, pattern, pattern);
  }
  // 分页值已由 service 约束为正整数，直接写入 SQL 兼容不支持 LIMIT 参数绑定的 MySQL。
  const pageSize = Math.max(1, Math.trunc(query.pageSize));
  const page = Math.max(1, Math.trunc(query.page));
  const offset = (page - 1) * pageSize;
  const paginationSql = 'LIMIT ' + pageSize + ' OFFSET ' + offset;
  const [rows] = await pool.execute<ListingRow[]>(
    `SELECT s.rental_id, s.title, s.content_preview, s.cover_photo_url,
            COALESCE(u.nickname, '租房用户') AS nickname, COALESCE(u.avatar_url, '') AS avatar_url,
            DATE_FORMAT(s.snapshot_date, '%Y-%m-%d') AS snapshot_date, s.updated_at
     FROM rental_public_snapshots s
     INNER JOIN (
       SELECT rental_id, MAX(snapshot_date) AS snapshot_date
       FROM rental_public_snapshots GROUP BY rental_id
     ) latest ON latest.rental_id = s.rental_id AND latest.snapshot_date = s.snapshot_date
     INNER JOIN rentals r ON r.id = s.rental_id
       AND r.status = 1 AND COALESCE(r.post_status, 'active') = 'active'
     LEFT JOIN users u ON u.openid = s.owner_openid
     WHERE 1 = 1 ` + keywordSql + `
     ORDER BY s.updated_at DESC ` + paginationSql,
    params
  );
  return rows.map((row) => ({
    rentalId: row.rental_id,
    title: row.title ?? '一方屋檐下的生活实录',
    contentPreview: row.content_preview ?? '',
    coverPhoto: row.cover_photo_url ?? undefined,
    nickname: row.nickname,
    avatar: row.avatar_url,
    latestSnapshotDate: row.snapshot_date,
    updatedAt: toIso(row.updated_at)
  }));
}

/** 批量统计日期闭区间内各房屋的快照数量。 */
export async function countRecentSnapshots(rentalIds: string[], range: HouseRecordDateRange) {
  await ensureHouseRecordSnapshotSchema();
  const result = new Map<string, number>();
  if (rentalIds.length === 0) return result;
  const sql = `SELECT rental_id, COUNT(*) AS total
    FROM rental_public_snapshots
    WHERE rental_id IN (__MARKS__) AND snapshot_date BETWEEN ? AND ?
    GROUP BY rental_id`.replace('__MARKS__', marks(rentalIds));
  const [rows] = await pool.execute<AggregateRow[]>(sql, [...rentalIds, range.start, range.end]);
  for (const row of rows) result.set(row.rental_id, Number(row.total ?? 0));
  return result;
}

/** 批量聚合空间完整、连续居住、凭证核验和私密照片标识。 */
export async function getBatchTrustLabels(rentalIds: string[]) {
  const labels = new Map<string, RentalTrustLabel[]>(
    rentalIds.map((rentalId) => [rentalId, ['SPACE_RECORD_COMPLETE']])
  );
  if (rentalIds.length === 0) return labels;
  await ensureRentalTrustSchema();
  const placeholders = marks(rentalIds);
  // 三路查询按批次执行，查询次数不随发现列表长度增长。
  const [checkinResult, proofResult, privatePhotoResult] = await Promise.all([
    pool.execute<AggregateRow[]>(
      `SELECT rental_id, period, captured_at FROM rental_residency_checkins
       WHERE rental_id IN (` + placeholders + `) AND status = 'VALID'
       ORDER BY rental_id, captured_at ASC`,
      rentalIds
    ),
    pool.execute<AggregateRow[]>(
      `SELECT DISTINCT p.rental_id FROM rental_post_proofs p
       INNER JOIN rental_proof_verifications v ON v.proof_id = p.id
       WHERE p.rental_id IN (` + placeholders + `) AND v.verification_status = 'VERIFIED'`,
      rentalIds
    ),
    pool.execute<AggregateRow[]>(
      `SELECT DISTINCT d.published_rental_id AS rental_id FROM rental_story_drafts d
       INNER JOIN rental_space_records r ON r.draft_id = d.id
       INNER JOIN rental_space_photos p ON p.space_record_id = r.id
       WHERE d.published_rental_id IN (` + placeholders + `)
         AND p.visibility = 'VERIFICATION_ONLY'`,
      rentalIds
    )
  ]);
  const grouped = new Map<string, Array<{ period: RentalEventPeriod; captured_at: Date | string }>>();
  for (const row of checkinResult[0]) {
    if (!row.period || !row.captured_at) continue;
    const current = grouped.get(row.rental_id) ?? [];
    current.push({ period: row.period, captured_at: row.captured_at });
    grouped.set(row.rental_id, current);
  }
  for (const [rentalId, checkins] of grouped) {
    if (summarizeRentalCheckins(checkins).hasContinuousResidency) {
      labels.get(rentalId)?.push('CONTINUOUS_RESIDENCY');
    }
  }
  for (const row of proofResult[0]) labels.get(row.rental_id)?.push('RESIDENCY_PROOF_VERIFIED');
  for (const row of privatePhotoResult[0]) labels.get(row.rental_id)?.push('VERIFICATION_ONLY_PHOTOS');
  return labels;
}

/** 读取活动房屋的公开作者摘要。 */
export async function getPublicHouseRecordSummary(rentalId: string) {
  await ensureHouseRecordSnapshotSchema();
  const [rows] = await pool.execute<SummaryRow[]>(
    `SELECT r.id AS rental_id, s.title, COALESCE(u.nickname, '租房用户') AS nickname,
            COALESCE(u.avatar_url, '') AS avatar_url
     FROM rentals r
     INNER JOIN rental_public_snapshots s ON s.rental_id = r.id
     LEFT JOIN users u ON u.openid = r.user_openid
     WHERE r.id = ? AND r.status = 1 AND COALESCE(r.post_status, 'active') = 'active'
     ORDER BY s.snapshot_date DESC LIMIT 1`,
    [rentalId]
  );
  const row = rows[0];
  return row
    ? {
        rentalId: row.rental_id,
        title: row.title ?? '一方屋檐下的生活实录',
        nickname: row.nickname,
        avatar: row.avatar_url
      }
    : null;
}

/** 读取截至今天的最近 15 个真实快照，供服务层保留今天及 14 个历史日期。 */
export async function listTimelineSnapshots(rentalId: string, today: string) {
  await ensureHouseRecordSnapshotSchema();
  const [rows] = await pool.execute<TimelineRow[]>(
    `SELECT s.id, DATE_FORMAT(s.snapshot_date, '%Y-%m-%d') AS snapshot_date,
            s.source, s.content_preview, s.cover_photo_url
     FROM rental_public_snapshots s
     INNER JOIN rentals r ON r.id = s.rental_id
       AND r.status = 1 AND COALESCE(r.post_status, 'active') = 'active'
     WHERE s.rental_id = ? AND s.snapshot_date <= ?
     ORDER BY s.snapshot_date DESC LIMIT 15`,
    [rentalId, today]
  );
  return rows.map((row) => ({
    snapshotId: row.id,
    snapshotDate: row.snapshot_date,
    source: row.source,
    contentPreview: row.content_preview ?? undefined,
    coverPhoto: row.cover_photo_url ?? undefined
  }));
}

/** 批量读取时间线快照包含的空间模块。 */
export async function listTimelineModules(snapshotIds: string[]) {
  await ensureHouseRecordSnapshotSchema();
  const result = new Map<string, HouseModuleId[]>();
  if (snapshotIds.length === 0) return result;
  const sql = `SELECT snapshot_id, module_type FROM rental_public_snapshot_spaces
    WHERE snapshot_id IN (__MARKS__)
    ORDER BY snapshot_id,
      FIELD(module_type, 'kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood')`
    .replace('__MARKS__', marks(snapshotIds));
  const [rows] = await pool.execute<ModuleRow[]>(sql, snapshotIds);
  for (const row of rows) {
    const modules = result.get(row.snapshot_id) ?? [];
    modules.push(row.module_type);
    result.set(row.snapshot_id, modules);
  }
  return result;
}

/** 读取活动房屋指定日期的公开快照主表。 */
export async function getPublicSnapshotHeader(rentalId: string, snapshotDate: string) {
  await ensureHouseRecordSnapshotSchema();
  const [rows] = await pool.execute<HeaderRow[]>(
    `SELECT s.id, s.rental_id, DATE_FORMAT(s.snapshot_date, '%Y-%m-%d') AS snapshot_date, s.source
     FROM rental_public_snapshots s
     INNER JOIN rentals r ON r.id = s.rental_id
       AND r.status = 1 AND COALESCE(r.post_status, 'active') = 'active'
     WHERE s.rental_id = ? AND s.snapshot_date = ? LIMIT 1`,
    [rentalId, snapshotDate]
  );
  const row = rows[0];
  return row
    ? { snapshotId: row.id, rentalId: row.rental_id, snapshotDate: row.snapshot_date, source: row.source }
    : null;
}

/** 读取指定快照固化的空间正文，不回查当前草稿。 */
export async function listSnapshotSpaces(snapshotId: string) {
  await ensureHouseRecordSnapshotSchema();
  const [rows] = await pool.execute<SpaceRow[]>(
    `SELECT id, module_type, scene_answers, observations, event_text,
            event_voice_url, event_occurred_period
     FROM rental_public_snapshot_spaces WHERE snapshot_id = ?
     ORDER BY FIELD(module_type, 'kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood')`,
    [snapshotId]
  );
  return rows.map((row) => ({
    snapshotSpaceId: row.id,
    module: row.module_type,
    sceneAnswers: parseArray<SpaceSceneAnswer>(row.scene_answers),
    observations: parseArray<{ label: string; value: string }>(row.observations),
    eventText: row.event_text ?? undefined,
    eventVoiceUrl: row.event_voice_url ?? undefined,
    eventOccurredPeriod: row.event_occurred_period ?? undefined
  }));
}

/** 批量读取快照空间的公开照片 URL。 */
export async function listSnapshotPhotos(snapshotSpaceIds: string[]) {
  await ensureHouseRecordSnapshotSchema();
  const result = new Map<string, string[]>();
  if (snapshotSpaceIds.length === 0) return result;
  const sql = `SELECT snapshot_space_id, file_url FROM rental_public_snapshot_photos
    WHERE snapshot_space_id IN (__MARKS__) ORDER BY snapshot_space_id, sort_order ASC`
    .replace('__MARKS__', marks(snapshotSpaceIds));
  const [rows] = await pool.execute<PhotoRow[]>(sql, snapshotSpaceIds);
  for (const row of rows) {
    const photos = result.get(row.snapshot_space_id) ?? [];
    photos.push(row.file_url);
    result.set(row.snapshot_space_id, photos);
  }
  return result;
}

/** 聚合详情页可信依据，私密照片只形成布尔标识。 */
export async function getRentalTrustEvidence(rentalId: string): Promise<RentalTrustEvidence> {
  await ensureRentalTrustSchema();
  const [labels, checkinResult] = await Promise.all([
    getBatchTrustLabels([rentalId]),
    pool.execute<AggregateRow[]>(
      `SELECT rental_id, period, captured_at FROM rental_residency_checkins
       WHERE rental_id = ? AND status = 'VALID' ORDER BY captured_at ASC`,
      [rentalId]
    )
  ]);
  const checkins = checkinResult[0]
    .filter((row) => Boolean(row.period && row.captured_at))
    .map((row) => ({
      period: row.period as RentalEventPeriod,
      captured_at: row.captured_at as Date | string
    }));
  const trustLabels = labels.get(rentalId) ?? [];
  return {
    labels: trustLabels,
    hasVerificationOnlyPhotos: trustLabels.includes('VERIFICATION_ONLY_PHOTOS'),
    checkins: summarizeRentalCheckins(checkins)
  };
}

/** 校验房主是否拥有指定房屋，并返回当前公开状态。 */
export async function getOwnerHouseRecordState(userOpenid: string, rentalId: string) {
  await ensureHouseRecordSnapshotSchema();
  const [rows] = await pool.execute<OwnerRow[]>(
    'SELECT user_openid, status, post_status FROM rentals WHERE id = ? AND user_openid = ? LIMIT 1',
    [rentalId, userOpenid]
  );
  const row = rows[0];
  return row
    ? {
        ownerOpenid: row.user_openid,
        isPublished: row.status === 1 && (row.post_status ?? 'active') === 'active'
      }
    : null;
}

/** 读取当前草稿和最后公开快照时间，用于判断是否需要更新实录。 */
export async function getOwnerSnapshotStatus(userOpenid: string, rentalId: string) {
  await ensureHouseRecordSnapshotSchema();
  const [rows] = await pool.execute<OwnerStatusRow[]>(
    `SELECT d.updated_at AS current_updated_at,
            DATE_FORMAT(s.snapshot_date, '%Y-%m-%d') AS latest_snapshot_date,
            s.updated_at AS latest_snapshot_updated_at
     FROM rental_story_drafts d
     LEFT JOIN rental_public_snapshots s ON s.id = (
       SELECT s2.id FROM rental_public_snapshots s2
       WHERE s2.rental_id = ? ORDER BY s2.snapshot_date DESC LIMIT 1
     )
     WHERE d.user_openid = ? AND d.published_rental_id = ?
     ORDER BY FIELD(d.status, 'DRAFT', 'PUBLISHED'), d.updated_at DESC LIMIT 1`,
    [rentalId, userOpenid, rentalId]
  );
  const row = rows[0];
  return row
    ? {
        currentUpdatedAt: toIso(row.current_updated_at),
        latestSnapshotDate: row.latest_snapshot_date ?? undefined,
        latestSnapshotUpdatedAt: row.latest_snapshot_updated_at
          ? toIso(row.latest_snapshot_updated_at)
          : undefined
      }
    : null;
}
