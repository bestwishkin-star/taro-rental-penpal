import type {
  CreateRentalInput,
  CreateRentalReportInput,
  FavoriteStatus,
  HandleRentalReportInput,
  ListRentalsQuery,
  RentalComment,
  RentalDetail,
  RentalListing,
  RentalPostStatus,
  RentalProofStatus,
  RentalReportDetail,
  RentalReportListItem,
  RentalReportReason,
  RentalStatus,
} from '@shared/contracts/rental';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

import { ensureRentalCommentSchema } from './rental-comment-schema';
import { ensureRentalTrustSchema } from './rental-trust-schema';

const STORY_FALLBACK_TITLE = '\u5c4b\u6a90\u6545\u4e8b';
const DEFAULT_COMMENT_AUTHOR = '\u4f4f\u53cb';

interface RentalRow extends RowDataPacket {
  id: string;
  title: string | null;
  photos: string | null;
  status: number;
  proof_status: string | null;
  post_status: string | null;
  comment_count: number | null;
  favorite_count: number | null;
  content_preview: string | null;
  created_at: Date | string | null;
}

interface RentalDetailRow extends RentalRow {
  experience: string;
  wechat: string | null;
}

interface RentalCommentRow extends RowDataPacket {
  id: string;
  rental_id: string;
  user_openid: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  created_at: Date | string;
}

interface RentalReportRow extends RowDataPacket {
  id: string;
  rental_id: string;
  rental_title: string | null;
  reporter_openid: string;
  reason: string;
  status: string;
  created_at: Date | string;
  description?: string | null;
  evidence_photos?: string | null;
  handled_by?: string | null;
  handled_note?: string | null;
  handled_at?: Date | string | null;
}

interface RentalProofRow extends RowDataPacket {
  file_url: string;
}

function safeParseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function mapStatus(status: number): RentalStatus {
  return status === 1 ? 'active' : 'inactive';
}

function mapPostStatus(value: string | null): RentalPostStatus {
  if (value === 'pending_review' || value === 'hidden' || value === 'rejected') return value;
  return 'active';
}

function mapProofStatus(value: string | null): RentalProofStatus {
  return value === 'submitted' ? 'submitted' : 'none';
}

function mapReportReason(value: string): RentalReportReason {
  if (
    value === 'fake_rent_or_address' ||
    value === 'fake_experience' ||
    value === 'agent_disguise' ||
    value === 'phishing' ||
    value === 'privacy_leak' ||
    value === 'harassment'
  ) {
    return value;
  }
  return 'other';
}

function toIsoString(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function mapRentalRow(row: RentalRow): RentalListing {
  return {
    id: row.id,
    title: row.title?.trim() || row.content_preview?.trim() || STORY_FALLBACK_TITLE,
    contentPreview: row.content_preview ?? undefined,
    photos: safeParseArray(row.photos),
    status: mapStatus(row.status),
    postStatus: mapPostStatus(row.post_status),
    proofStatus: mapProofStatus(row.proof_status),
    commentCount: row.comment_count ?? 0,
    favoriteCount: row.favorite_count ?? 0,
    createdAt: toIsoString(row.created_at)
  };
}

async function readRentalColumns(): Promise<Set<string>> {
  const [rows] = await pool.execute<RowDataPacket[]>('SHOW COLUMNS FROM rentals');
  return new Set(rows.map((row) => String(row.Field)));
}

function columnExpr(columns: Set<string>, column: string, fallback: string, alias = ''): string {
  const prefix = alias ? `${alias}.` : '';
  return columns.has(column) ? `${prefix}${column} AS ${column}` : `${fallback} AS ${column}`;
}

function buildSelectColumns(columns: Set<string>, alias = ''): string[] {
  const prefix = alias ? `${alias}.` : '';
  const selected = [`${prefix}id AS id`, `${prefix}photos AS photos`, `${prefix}status AS status`];
  selected.push(`LEFT(${prefix}experience, 120) AS content_preview`);
  selected.push(columnExpr(columns, 'title', `LEFT(${prefix}experience, 28)`, alias));
  selected.push(columnExpr(columns, 'proof_status', "'none'", alias));
  selected.push(columnExpr(columns, 'post_status', "'active'", alias));
  selected.push(columnExpr(columns, 'comment_count', '0', alias));
  selected.push(columnExpr(columns, 'favorite_count', '0', alias));
  selected.push(columnExpr(columns, 'created_at', 'NULL', alias));
  return selected;
}

function pushIfColumn(
  existingColumns: Set<string>,
  targetColumns: string[],
  values: Array<string | number | null>,
  column: string,
  value: string | number | null
) {
  if (!existingColumns.has(column)) return;
  targetColumns.push(column);
  values.push(value);
}

function buildInsertStatement(
  id: string,
  userOpenid: string,
  input: CreateRentalInput,
  rentalColumns: Set<string>
) {
  const title = input.title?.trim() || input.experience.trim().slice(0, 28) || STORY_FALLBACK_TITLE;
  const columns = ['id', 'user_openid'];
  const values: Array<string | number | null> = [id, userOpenid];

  pushIfColumn(rentalColumns, columns, values, 'price', '');
  pushIfColumn(rentalColumns, columns, values, 'location', STORY_FALLBACK_TITLE);
  pushIfColumn(rentalColumns, columns, values, 'province', null);
  pushIfColumn(rentalColumns, columns, values, 'city', null);
  pushIfColumn(rentalColumns, columns, values, 'district', null);
  pushIfColumn(rentalColumns, columns, values, 'address', null);
  pushIfColumn(rentalColumns, columns, values, 'latitude', null);
  pushIfColumn(rentalColumns, columns, values, 'longitude', null);
  pushIfColumn(rentalColumns, columns, values, 'title', title);
  pushIfColumn(rentalColumns, columns, values, 'landmark', null);
  pushIfColumn(rentalColumns, columns, values, 'rental_type', null);
  pushIfColumn(rentalColumns, columns, values, 'stay_stage', null);
  pushIfColumn(rentalColumns, columns, values, 'commute', '');
  pushIfColumn(rentalColumns, columns, values, 'proof_status', input.proofPhotos?.length ? 'submitted' : 'none');
  pushIfColumn(rentalColumns, columns, values, 'post_status', 'active');
  pushIfColumn(rentalColumns, columns, values, 'room_type', STORY_FALLBACK_TITLE);
  pushIfColumn(rentalColumns, columns, values, 'area', '');
  pushIfColumn(rentalColumns, columns, values, 'tags', JSON.stringify([]));
  pushIfColumn(rentalColumns, columns, values, 'wechat', input.wechat ?? '');

  columns.push('experience', 'photos', 'status');
  values.push(input.experience, JSON.stringify(input.photos), 1);

  if (rentalColumns.has('created_at')) columns.push('created_at');
  if (rentalColumns.has('updated_at')) columns.push('updated_at');

  const placeholders = columns.map((column) => (column === 'created_at' || column === 'updated_at' ? 'NOW()' : '?'));
  return {
    sql: `INSERT INTO rentals (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values
  };
}

export async function getRentalById(id: string): Promise<RentalDetail | null> {
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(rentalColumns).join(', ');
  const wechatColumn = columnExpr(rentalColumns, 'wechat', "''");
  const postStatusCondition = rentalColumns.has('post_status')
    ? "AND COALESCE(post_status, 'active') <> 'hidden'"
    : '';
  const [rows] = await pool.execute<RentalDetailRow[]>(
    `SELECT ${columns}, experience, ${wechatColumn} FROM rentals WHERE id = ? AND status = 1 ${postStatusCondition}`,
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...mapRentalRow(row),
    experience: row.experience,
    wechat: row.wechat ?? ''
  };
}

export async function createRental(userOpenid: string, input: CreateRentalInput): Promise<{ id: string }> {
  const rentalColumns = await readRentalColumns();
  const id = generateId();
  const { sql, values } = buildInsertStatement(id, userOpenid, input, rentalColumns);
  await pool.execute(sql, values);
  return { id };
}

/** 批量保存用户提交的居住凭证照片。 */
export async function createRentalProofs(userOpenid: string, rentalId: string, proofPhotos: string[] = []): Promise<void> {
  if (proofPhotos.length === 0) return;
  await ensureRentalTrustSchema();
  const rows = proofPhotos.map((url) => [generateId(), rentalId, userOpenid, url, new Date()]);
  await pool.query('INSERT INTO rental_post_proofs (id, rental_id, user_openid, file_url, created_at) VALUES ?', [rows]);
}

export async function listRentals(query: ListRentalsQuery = {}): Promise<RentalListing[]> {
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(rentalColumns).join(', ');

  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize ?? '10', 10) || 10));
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const offset = (page - 1) * pageSize;

  const whereConditions: string[] = ['status = 1'];
  const whereParams: Array<string | number> = [];

  if (rentalColumns.has('post_status')) {
    whereConditions.push("COALESCE(post_status, 'active') = 'active'");
  }

  const keyword = query.keyword?.trim();
  if (keyword) {
    if (rentalColumns.has('title')) {
      whereConditions.push('(title LIKE ? OR experience LIKE ?)');
      whereParams.push(`%${keyword}%`, `%${keyword}%`);
    } else {
      whereConditions.push('experience LIKE ?');
      whereParams.push(`%${keyword}%`);
    }
  }

  const where = whereConditions.join(' AND ');
  const orderColumn = rentalColumns.has('created_at') ? 'created_at' : 'id';
  const sql = `SELECT ${columns} FROM rentals WHERE ${where} ORDER BY ${orderColumn} DESC LIMIT ${pageSize} OFFSET ${offset}`;
  const [rows] = await pool.execute<RentalRow[]>(sql, whereParams);
  return rows.map(mapRentalRow);
}

export async function listMyRentals(userOpenid: string): Promise<RentalListing[]> {
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(rentalColumns).join(', ');
  const orderColumn = rentalColumns.has('created_at') ? 'created_at' : 'id';
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT ${columns} FROM rentals WHERE user_openid = ? ORDER BY ${orderColumn} DESC`,
    [userOpenid]
  );
  return rows.map(mapRentalRow);
}

export async function updateRentalStatus(id: string, openid: string, status: 0 | 1): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    'UPDATE rentals SET status = ?, updated_at = NOW() WHERE id = ? AND user_openid = ?',
    [status, id, openid]
  );
  return result.affectedRows > 0;
}

export async function getFavoriteStatus(userOpenid: string, rentalId: string): Promise<FavoriteStatus> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM favorites WHERE user_openid = ? AND rental_id = ?',
    [userOpenid, rentalId]
  );
  return { isFavorited: rows.length > 0 };
}

export async function toggleFavorite(userOpenid: string, rentalId: string): Promise<FavoriteStatus> {
  const { isFavorited } = await getFavoriteStatus(userOpenid, rentalId);
  const rentalColumns = await readRentalColumns();
  if (isFavorited) {
    await pool.execute('DELETE FROM favorites WHERE user_openid = ? AND rental_id = ?', [userOpenid, rentalId]);
    if (rentalColumns.has('favorite_count')) {
      await pool.execute('UPDATE rentals SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = ?', [rentalId]);
    }
    return { isFavorited: false };
  }
  await pool.execute('INSERT INTO favorites (user_openid, rental_id, created_at) VALUES (?, ?, NOW())', [
    userOpenid,
    rentalId
  ]);
  if (rentalColumns.has('favorite_count')) {
    await pool.execute('UPDATE rentals SET favorite_count = favorite_count + 1 WHERE id = ?', [rentalId]);
  }
  return { isFavorited: true };
}

export async function listFavorites(userOpenid: string): Promise<RentalListing[]> {
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(rentalColumns, 'r').join(', ');
  const postStatusCondition = rentalColumns.has('post_status') ? "AND COALESCE(r.post_status, 'active') = 'active'" : '';
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT ${columns}
     FROM rentals r
     INNER JOIN favorites f ON r.id = f.rental_id
     WHERE f.user_openid = ? AND r.status = 1 ${postStatusCondition}
     ORDER BY f.created_at DESC`,
    [userOpenid]
  );
  return rows.map(mapRentalRow);
}

/** 读取指定屋檐故事的有效公开评论。 */
export async function listRentalComments(rentalId: string): Promise<RentalComment[]> {
  await ensureRentalCommentSchema();
  const [rows] = await pool.execute<RentalCommentRow[]>(
    `SELECT c.id, c.rental_id, c.user_openid, u.nickname, u.avatar_url, c.content, c.created_at
     FROM rental_post_comments c
     LEFT JOIN users u ON u.openid = c.user_openid
     WHERE c.rental_id = ? AND c.status = 'active'
     ORDER BY c.created_at ASC`,
    [rentalId]
  );
  return rows.map((row) => ({
    id: row.id,
    rentalId: row.rental_id,
    authorOpenid: row.user_openid,
    authorName: row.nickname || DEFAULT_COMMENT_AUTHOR,
    authorAvatar: row.avatar_url || '',
    content: row.content,
    createdAt: new Date(row.created_at).toISOString()
  }));
}

/** 创建公开评论，并同步维护故事评论数量。 */
export async function createRentalComment(userOpenid: string, rentalId: string, content: string): Promise<RentalComment> {
  await ensureRentalCommentSchema();
  const id = generateId();
  await pool.execute(
    `INSERT INTO rental_post_comments (id, rental_id, user_openid, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [id, rentalId, userOpenid, content]
  );
  const rentalColumns = await readRentalColumns();
  if (rentalColumns.has('comment_count')) {
    await pool.execute('UPDATE rentals SET comment_count = comment_count + 1 WHERE id = ?', [rentalId]);
  }
  const comments = await listRentalComments(rentalId);
  return comments.find((comment) => comment.id === id) ?? comments[comments.length - 1];
}

/** 软删除当前用户自己的评论，并同步维护故事评论数量。 */
export async function deleteRentalComment(userOpenid: string, commentId: string): Promise<boolean> {
  await ensureRentalCommentSchema();
  const [commentRows] = await pool.execute<RowDataPacket[]>(
    "SELECT rental_id FROM rental_post_comments WHERE id = ? AND user_openid = ? AND status = 'active'",
    [commentId, userOpenid]
  );
  if (commentRows.length === 0) return false;
  const rentalId = String(commentRows[0].rental_id);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE rental_post_comments
     SET status = 'deleted', updated_at = NOW()
     WHERE id = ? AND user_openid = ? AND status = 'active'`,
    [commentId, userOpenid]
  );
  if (result.affectedRows > 0) {
    const rentalColumns = await readRentalColumns();
    if (rentalColumns.has('comment_count')) {
      await pool.execute('UPDATE rentals SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = ?', [rentalId]);
    }
  }
  return result.affectedRows > 0;
}

export async function createRentalReport(
  reporterOpenid: string,
  rentalId: string,
  input: CreateRentalReportInput
): Promise<{ id: string }> {
  const id = generateId();
  await pool.execute(
    `INSERT INTO rental_post_reports
      (id, rental_id, reporter_openid, reason, description, evidence_photos, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [id, rentalId, reporterOpenid, input.reason, input.description, JSON.stringify(input.evidencePhotos ?? [])]
  );
  const rentalColumns = await readRentalColumns();
  if (rentalColumns.has('post_status')) {
    await pool.execute("UPDATE rentals SET post_status = 'pending_review' WHERE id = ? AND post_status = 'active'", [
      rentalId
    ]);
  }
  return { id };
}

export async function listRentalReports(): Promise<RentalReportListItem[]> {
  const rentalColumns = await readRentalColumns();
  const titleExpr = rentalColumns.has('title') ? 'r.title' : 'LEFT(r.experience, 28)';
  const [rows] = await pool.execute<RentalReportRow[]>(
    `SELECT rp.id, rp.rental_id, ${titleExpr} AS rental_title, rp.reporter_openid, rp.reason, rp.status, rp.created_at
     FROM rental_post_reports rp
     INNER JOIN rentals r ON r.id = rp.rental_id
     ORDER BY rp.created_at DESC
     LIMIT 100`
  );
  return rows.map((row) => ({
    id: row.id,
    rentalId: row.rental_id,
    rentalTitle: row.rental_title || STORY_FALLBACK_TITLE,
    reporterOpenid: row.reporter_openid,
    reason: mapReportReason(row.reason),
    status: row.status === 'handled' ? 'handled' : 'pending',
    createdAt: new Date(row.created_at).toISOString()
  }));
}

/** 读取举报详情及关联的居住凭证。 */
export async function getRentalReportById(reportId: string): Promise<RentalReportDetail | null> {
  await ensureRentalTrustSchema();
  const rentalColumns = await readRentalColumns();
  const titleExpr = rentalColumns.has('title') ? 'r.title' : 'LEFT(r.experience, 28)';
  const [rows] = await pool.execute<RentalReportRow[]>(
    `SELECT rp.id, rp.rental_id, ${titleExpr} AS rental_title, rp.reporter_openid, rp.reason, rp.status, rp.created_at,
            rp.description, rp.evidence_photos, rp.handled_by, rp.handled_note, rp.handled_at
     FROM rental_post_reports rp
     INNER JOIN rentals r ON r.id = rp.rental_id
     WHERE rp.id = ?`,
    [reportId]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  const [proofRows] = await pool.execute<RentalProofRow[]>(
    'SELECT file_url FROM rental_post_proofs WHERE rental_id = ? ORDER BY created_at ASC',
    [row.rental_id]
  );
  return {
    id: row.id,
    rentalId: row.rental_id,
    rentalTitle: row.rental_title || STORY_FALLBACK_TITLE,
    reporterOpenid: row.reporter_openid,
    reason: mapReportReason(row.reason),
    status: row.status === 'handled' ? 'handled' : 'pending',
    createdAt: new Date(row.created_at).toISOString(),
    description: row.description || '',
    evidencePhotos: safeParseArray(row.evidence_photos ?? null),
    proofPhotos: proofRows.map((proof) => proof.file_url),
    handledBy: row.handled_by ?? undefined,
    handledNote: row.handled_note ?? undefined,
    handledAt: toIsoString(row.handled_at ?? null)
  };
}

export async function handleRentalReport(
  reportId: string,
  adminOpenid: string,
  input: HandleRentalReportInput
): Promise<boolean> {
  const [reports] = await pool.execute<RowDataPacket[]>('SELECT rental_id FROM rental_post_reports WHERE id = ?', [
    reportId
  ]);
  if (reports.length === 0) return false;
  const rentalId = String(reports[0].rental_id);
  await pool.execute('UPDATE rentals SET post_status = ?, updated_at = NOW() WHERE id = ?', [input.postStatus, rentalId]);
  await pool.execute(
    `UPDATE rental_post_reports
     SET status = 'handled', handled_by = ?, handled_note = ?, handled_at = NOW()
     WHERE id = ?`,
    [adminOpenid, input.handledNote, reportId]
  );
  return true;
}
