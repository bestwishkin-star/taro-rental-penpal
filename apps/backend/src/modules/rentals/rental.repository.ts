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
  RentalStayStage,
  RentalStatus,
  RentalType,
  UpdateRentalSupplementInput
} from '@shared/contracts/rental';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

import {
  buildRegionDistanceOrderFragment,
  buildRegionFilterFragments,
  buildRentalLocationLabel,
  detectRentalLocationSchema,
  hasStructuredLocationColumns,
  type RentalLocationSchema
} from './location-utils';

interface RentalRow extends RowDataPacket {
  id: string;
  title: string | null;
  price: string;
  location: string;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  landmark: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  room_type: string;
  rental_type: string | null;
  stay_stage: string | null;
  area: string;
  commute: string | null;
  tags: string | null;
  photos: string | null;
  status: number;
  proof_status: string | null;
  post_status: string | null;
  comment_count: number | null;
  favorite_count: number | null;
  created_at: Date | string | null;
}

interface RentalDetailRow extends RentalRow {
  experience: string;
  wechat: string;
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
  description?: string;
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

function mapRentalType(value: string | null): RentalType | undefined {
  if (value === 'whole' || value === 'shared' || value === 'single' || value === 'sublet' || value === 'short') {
    return value;
  }
  return undefined;
}

function mapStayStage(value: string | null): RentalStayStage | undefined {
  if (value === 'living' || value === 'moved_out' || value === 'viewing' || value === 'subletting') return value;
  return undefined;
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

function toNumber(value: number | string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoString(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function mapRentalRow(row: RentalRow): RentalListing {
  return {
    id: row.id,
    title: row.title?.trim() || `${row.room_type} / ${row.location}`,
    location: row.location,
    province: row.province ?? undefined,
    city: row.city ?? undefined,
    district: row.district ?? undefined,
    address: row.address ?? undefined,
    landmark: row.landmark ?? undefined,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    rentalType: mapRentalType(row.rental_type),
    stayStage: mapStayStage(row.stay_stage),
    commute: row.commute ?? undefined,
    tags: safeParseArray(row.tags),
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

function buildSelectColumns(schema: RentalLocationSchema, columns: Set<string>, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  const selected = [`${prefix}id AS id`, `${prefix}price AS price`, `${prefix}location AS location`];

  if (hasStructuredLocationColumns(schema)) {
    selected.push(`${prefix}province AS province`, `${prefix}city AS city`, `${prefix}district AS district`);
  } else {
    selected.push('NULL AS province', 'NULL AS city', 'NULL AS district');
  }

  selected.push(schema.address ? `${prefix}address AS address` : 'NULL AS address');
  selected.push(schema.latitude ? `${prefix}latitude AS latitude` : 'NULL AS latitude');
  selected.push(schema.longitude ? `${prefix}longitude AS longitude` : 'NULL AS longitude');
  selected.push(`${prefix}room_type AS room_type`, `${prefix}area AS area`, `${prefix}tags AS tags`, `${prefix}photos AS photos`, `${prefix}status AS status`);
  selected.push(columnExpr(columns, 'title', "''", alias));
  selected.push(columnExpr(columns, 'landmark', 'NULL', alias));
  selected.push(columnExpr(columns, 'rental_type', "'shared'", alias));
  selected.push(columnExpr(columns, 'stay_stage', "'living'", alias));
  selected.push(columnExpr(columns, 'commute', "''", alias));
  selected.push(columnExpr(columns, 'proof_status', "'none'", alias));
  selected.push(columnExpr(columns, 'post_status', "'active'", alias));
  selected.push(columnExpr(columns, 'comment_count', '0', alias));
  selected.push(columnExpr(columns, 'favorite_count', '0', alias));
  selected.push(columnExpr(columns, 'created_at', 'NULL', alias));
  return selected;
}

function pushIfColumn(columns: Set<string>, targetColumns: string[], values: Array<string | number | null>, column: string, value: string | number | null) {
  if (!columns.has(column)) return;
  targetColumns.push(column);
  values.push(value);
}

function buildInsertStatement(
  id: string,
  userOpenid: string,
  input: CreateRentalInput,
  schema: RentalLocationSchema,
  rentalColumns: Set<string>
) {
  const columns = ['id', 'user_openid', 'price', 'location'];
  const values: Array<string | number | null> = [
    id,
    userOpenid,
    input.price ?? '',
    buildRentalLocationLabel({
      location: input.location ?? '待补充',
      province: input.province,
      city: input.city,
      district: input.district,
      address: input.landmark ?? input.address
    })
  ];

  if (hasStructuredLocationColumns(schema)) {
    columns.push('province', 'city', 'district');
    values.push(input.province ?? null, input.city ?? null, input.district ?? null);
  }
  if (schema.address) {
    columns.push('address');
    values.push(input.address ?? null);
  }
  if (schema.latitude) {
    columns.push('latitude');
    values.push(input.latitude ?? null);
  }
  if (schema.longitude) {
    columns.push('longitude');
    values.push(input.longitude ?? null);
  }

  pushIfColumn(rentalColumns, columns, values, 'title', input.title);
  pushIfColumn(rentalColumns, columns, values, 'landmark', input.landmark ?? input.address ?? null);
  pushIfColumn(rentalColumns, columns, values, 'rental_type', input.rentalType ?? 'shared');
  pushIfColumn(rentalColumns, columns, values, 'stay_stage', input.stayStage ?? 'living');
  pushIfColumn(rentalColumns, columns, values, 'commute', input.commute ?? '');
  pushIfColumn(rentalColumns, columns, values, 'proof_status', input.proofPhotos?.length ? 'submitted' : 'none');
  pushIfColumn(rentalColumns, columns, values, 'post_status', 'active');

  columns.push('room_type', 'area', 'experience', 'tags', 'wechat', 'photos', 'status', 'created_at', 'updated_at');
  values.push(
    input.roomType ?? '待补充',
    input.area ?? '',
    input.experience,
    JSON.stringify(input.tags),
    input.wechat ?? '',
    JSON.stringify(input.photos),
    1
  );

  const placeholders = columns.map((column) => (column === 'created_at' || column === 'updated_at' ? 'NOW()' : '?'));
  return {
    sql: `INSERT INTO rentals (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values
  };
}

async function readSchema() {
  return detectRentalLocationSchema();
}

export async function getRentalById(id: string): Promise<RentalDetail | null> {
  const schema = await readSchema();
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(schema, rentalColumns).join(', ');
  const [rows] = await pool.execute<RentalDetailRow[]>(
    `SELECT ${columns}, experience, wechat FROM rentals WHERE id = ? AND status = 1 AND ${rentalColumns.has('post_status') ? "COALESCE(post_status, 'active') <> 'hidden'" : '1 = 1'}`,
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    ...mapRentalRow(row),
    experience: row.experience,
    wechat: row.wechat
  };
}

export async function createRental(userOpenid: string, input: CreateRentalInput): Promise<{ id: string }> {
  const schema = await readSchema();
  const rentalColumns = await readRentalColumns();
  const id = generateId();
  const { sql, values } = buildInsertStatement(id, userOpenid, input, schema, rentalColumns);
  await pool.execute(sql, values);
  return { id };
}

export async function createRentalProofs(userOpenid: string, rentalId: string, proofPhotos: string[] = []): Promise<void> {
  if (proofPhotos.length === 0) return;
  const rows = proofPhotos.map((url) => [generateId(), rentalId, userOpenid, url, new Date()]);
  await pool.query('INSERT INTO rental_post_proofs (id, rental_id, user_openid, file_url, created_at) VALUES ?', [rows]);
}

export async function listRentals(query: ListRentalsQuery = {}): Promise<RentalListing[]> {
  const schema = await readSchema();
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(schema, rentalColumns).join(', ');
  const { conditions, params } = buildRegionFilterFragments(query, schema);
  const order = buildRegionDistanceOrderFragment(query, schema);

  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize ?? '10', 10) || 10));
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const offset = (page - 1) * pageSize;

  const whereConditions: string[] = ['status = 1'];
  const whereParams: Array<string | number> = [];

  if (rentalColumns.has('post_status')) {
    whereConditions.push("COALESCE(post_status, 'active') = 'active'");
  }

  if (query.keyword) {
    if (rentalColumns.has('title')) {
      whereConditions.push('(location LIKE ? OR title LIKE ? OR experience LIKE ?)');
      whereParams.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
    } else {
      whereConditions.push('(location LIKE ? OR experience LIKE ?)');
      whereParams.push(`%${query.keyword}%`, `%${query.keyword}%`);
    }
  }

  if (query.filter === 'whole') {
    whereConditions.push('room_type = ?');
    whereParams.push('整租');
  } else if (query.filter === 'shared') {
    whereConditions.push('room_type = ?');
    whereParams.push('合租');
  } else if (query.filter === 'single') {
    whereConditions.push('room_type = ?');
    whereParams.push('单间');
  } else if (query.filter === 'subway') {
    whereConditions.push("JSON_SEARCH(tags, 'one', '地铁') IS NOT NULL");
  }

  if (query.priceRange === 'lt2000') {
    whereConditions.push('CAST(price AS UNSIGNED) < 2000');
  } else if (query.priceRange === '2000to4000') {
    whereConditions.push('CAST(price AS UNSIGNED) BETWEEN 2000 AND 4000');
  } else if (query.priceRange === 'gt4000') {
    whereConditions.push('CAST(price AS UNSIGNED) > 4000');
  }

  whereConditions.push(...conditions);
  whereParams.push(...params);

  const where = whereConditions.join(' AND ');
  const sql = `SELECT ${columns} FROM rentals WHERE ${where} ORDER BY ${order.clause} LIMIT ${pageSize} OFFSET ${offset}`;
  const [rows] = await pool.execute<RentalRow[]>(sql, [...whereParams, ...order.params]);
  return rows.map(mapRentalRow);
}

export async function listMyRentals(userOpenid: string): Promise<RentalListing[]> {
  const schema = await readSchema();
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(schema, rentalColumns).join(', ');
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT ${columns} FROM rentals WHERE user_openid = ? ORDER BY created_at DESC`,
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
  const schema = await readSchema();
  const rentalColumns = await readRentalColumns();
  const columns = buildSelectColumns(schema, rentalColumns, 'r').join(', ');
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

export async function listRentalComments(rentalId: string): Promise<RentalComment[]> {
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
    authorName: row.nickname || '租友',
    authorAvatar: row.avatar_url || '',
    content: row.content,
    createdAt: new Date(row.created_at).toISOString()
  }));
}

export async function createRentalComment(userOpenid: string, rentalId: string, content: string): Promise<RentalComment> {
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

export async function deleteRentalComment(userOpenid: string, commentId: string): Promise<boolean> {
  const [commentRows] = await pool.execute<RowDataPacket[]>(
    'SELECT rental_id FROM rental_post_comments WHERE id = ? AND user_openid = ? AND status = \'active\'',
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
  const [rows] = await pool.execute<RentalReportRow[]>(
    `SELECT rp.id, rp.rental_id, r.title AS rental_title, rp.reporter_openid, rp.reason, rp.status, rp.created_at
     FROM rental_post_reports rp
     INNER JOIN rentals r ON r.id = rp.rental_id
     ORDER BY rp.created_at DESC
     LIMIT 100`
  );
  return rows.map((row) => ({
    id: row.id,
    rentalId: row.rental_id,
    rentalTitle: row.rental_title || '未命名租房经历',
    reporterOpenid: row.reporter_openid,
    reason: mapReportReason(row.reason),
    status: row.status === 'handled' ? 'handled' : 'pending',
    createdAt: new Date(row.created_at).toISOString()
  }));
}

export async function getRentalReportById(reportId: string): Promise<RentalReportDetail | null> {
  const [rows] = await pool.execute<RentalReportRow[]>(
    `SELECT rp.id, rp.rental_id, r.title AS rental_title, rp.reporter_openid, rp.reason, rp.status, rp.created_at,
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
    rentalTitle: row.rental_title || '未命名租房经历',
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


export async function updateRentalSupplement(
  id: string,
  userOpenid: string,
  input: UpdateRentalSupplementInput
): Promise<boolean> {
  const schema = await readSchema();
  const rentalColumns = await readRentalColumns();
  const setFragments: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.price !== undefined) {
    setFragments.push('price = ?');
    values.push(input.price);
  }

  const location =
    input.location?.trim() ||
    buildRentalLocationLabel({
      province: input.province,
      city: input.city,
      district: input.district,
      address: input.landmark
    });
  if (location) {
    setFragments.push('location = ?');
    values.push(location);
  }

  if (hasStructuredLocationColumns(schema)) {
    if (input.province !== undefined) {
      setFragments.push('province = ?');
      values.push(input.province ?? null);
    }
    if (input.city !== undefined) {
      setFragments.push('city = ?');
      values.push(input.city ?? null);
    }
    if (input.district !== undefined) {
      setFragments.push('district = ?');
      values.push(input.district ?? null);
    }
  }

  if (rentalColumns.has('landmark') && input.landmark !== undefined) {
    setFragments.push('landmark = ?');
    values.push(input.landmark ?? null);
  }
  if (input.roomType !== undefined) {
    setFragments.push('room_type = ?');
    values.push(input.roomType);
  }
  if (rentalColumns.has('rental_type') && input.rentalType !== undefined) {
    setFragments.push('rental_type = ?');
    values.push(input.rentalType);
  }
  if (rentalColumns.has('stay_stage') && input.stayStage !== undefined) {
    setFragments.push('stay_stage = ?');
    values.push(input.stayStage);
  }
  if (input.area !== undefined) {
    setFragments.push('area = ?');
    values.push(input.area ?? '');
  }
  if (rentalColumns.has('commute') && input.commute !== undefined) {
    setFragments.push('commute = ?');
    values.push(input.commute ?? '');
  }

  if (setFragments.length === 0) return true;
  setFragments.push('updated_at = NOW()');
  values.push(id, userOpenid);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE rentals SET ${setFragments.join(', ')} WHERE id = ? AND user_openid = ?`,
    values
  );
  return result.affectedRows > 0;
}
