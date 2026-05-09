import type {
  CreateRentalInput,
  FavoriteStatus,
  ListRentalsQuery,
  RentalDetail,
  RentalListing,
  RentalStatus
} from '@shared/contracts/rental';
import type { RowDataPacket } from 'mysql2/promise';

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

/** rentals 表基础行结构，覆盖列表和详情都会用到的字段。 */
interface RentalRow extends RowDataPacket {
  id: string;
  price: string;
  location: string;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  room_type: string;
  area: string;
  tags: string | null;
  photos: string | null;
  status: number;
}

/** 房源详情额外包含描述和联系方式字段。 */
interface RentalDetailRow extends RentalRow {
  experience: string;
  wechat: string;
}

/** 安全解析数据库中的 JSON 数组字段，异常时回退为空数组。 */
function safeParseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** 将数据库 status 数值映射为前端契约中的房源状态。 */
function mapStatus(status: number): RentalStatus {
  return status === 1 ? 'active' : 'inactive';
}

/** 将数据库中的经纬度值转换为 number，空值或非法值返回 undefined。 */
function toNumber(value: number | string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** 将 rentals 表行数据转换为前端列表卡片使用的房源模型。 */
function mapRentalRow(row: RentalRow): RentalListing {
  return {
    id: row.id,
    title: `${row.room_type} / ${row.location}`,
    location: row.location,
    province: row.province ?? undefined,
    city: row.city ?? undefined,
    district: row.district ?? undefined,
    address: row.address ?? undefined,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    tags: safeParseArray(row.tags),
    photos: safeParseArray(row.photos),
    status: mapStatus(row.status)
  };
}

/** 根据当前数据库结构动态拼接查询列，兼容旧表结构。 */
function getSelectColumns(schema: RentalLocationSchema) {
  const columns = ['id', 'price', 'location'];

  if (hasStructuredLocationColumns(schema)) {
    columns.push('province', 'city', 'district');
  }
  if (schema.address) {
    columns.push('address');
  }
  if (schema.latitude) {
    columns.push('latitude');
  }
  if (schema.longitude) {
    columns.push('longitude');
  }

  columns.push('room_type', 'area', 'tags', 'photos', 'status');
  return columns;
}

/** 根据数据库位置字段能力构造发布房源的 INSERT 语句。 */
function buildInsertStatement(id: string, userOpenid: string, input: CreateRentalInput, schema: RentalLocationSchema) {
  const columns = ['id', 'user_openid', 'price', 'location'];
  const values: (string | number | null)[] = [
    id,
    userOpenid,
    input.price,
    buildRentalLocationLabel({
      location: input.location,
      province: input.province,
      city: input.city,
      district: input.district,
      address: input.address
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

  columns.push('room_type', 'area', 'experience', 'tags', 'wechat', 'photos', 'status', 'created_at', 'updated_at');
  values.push(
    input.roomType,
    input.area ?? '',
    input.experience,
    JSON.stringify(input.tags),
    input.wechat ?? '',
    JSON.stringify(input.photos),
    1
  );

  const placeholders = columns.map((column) => {
    if (column === 'created_at' || column === 'updated_at') {
      return 'NOW()';
    }
    return '?';
  });

  return {
    sql: `INSERT INTO rentals (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    values
  };
}

/** 读取并缓存 rentals 表位置相关字段能力。 */
async function readSchema() {
  return detectRentalLocationSchema();
}

/** 查询单个已上架房源详情。 */
export async function getRentalById(id: string): Promise<RentalDetail | null> {
  const schema = await readSchema();
  const columns = getSelectColumns(schema).join(', ');
  const [rows] = await pool.execute<RentalDetailRow[]>(
    `SELECT ${columns}, experience, wechat FROM rentals WHERE id = ? AND status = 1`,
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

/** 创建房源记录并返回生成的房源 id。 */
export async function createRental(userOpenid: string, input: CreateRentalInput): Promise<{ id: string }> {
  const schema = await readSchema();
  const id = generateId();
  const { sql, values } = buildInsertStatement(id, userOpenid, input, schema);
  await pool.execute(sql, values);
  return { id };
}

/** 按关键词、筛选、价格、地区和分页条件查询公开房源。 */
export async function listRentals(query: ListRentalsQuery = {}): Promise<RentalListing[]> {
  const schema = await readSchema();
  const columns = getSelectColumns(schema).join(', ');
  const { conditions, params } = buildRegionFilterFragments(query, schema);
  const order = buildRegionDistanceOrderFragment(query, schema);

  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize ?? '10', 10) || 10));
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const offset = (page - 1) * pageSize;

  const whereConditions: string[] = ['status = 1'];
  const whereParams: (string | number)[] = [];

  if (query.keyword) {
    whereConditions.push('location LIKE ?');
    whereParams.push(`%${query.keyword}%`);
  }

  if (query.filter === 'whole') {
    whereConditions.push('room_type = ?');
    whereParams.push('\u6574\u79df');
  } else if (query.filter === 'shared') {
    whereConditions.push('room_type = ?');
    whereParams.push('\u5408\u79df');
  } else if (query.filter === 'single') {
    whereConditions.push('room_type = ?');
    whereParams.push('\u5355\u95f4');
  } else if (query.filter === 'subway') {
    whereConditions.push("JSON_SEARCH(tags, 'one', '\u5730\u94c1') IS NOT NULL");
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

/** 查询指定用户发布的所有房源。 */
export async function listMyRentals(userOpenid: string): Promise<RentalListing[]> {
  const schema = await readSchema();
  const columns = getSelectColumns(schema).join(', ');
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT ${columns} FROM rentals WHERE user_openid = ? ORDER BY created_at DESC`,
    [userOpenid]
  );
  return rows.map(mapRentalRow);
}

/** 更新房源上下架状态，并限制只能由房源作者修改。 */
export async function updateRentalStatus(id: string, openid: string, status: 0 | 1): Promise<boolean> {
  const [result] = await pool.execute<import('mysql2/promise').ResultSetHeader>(
    'UPDATE rentals SET status = ?, updated_at = NOW() WHERE id = ? AND user_openid = ?',
    [status, id, openid]
  );
  return result.affectedRows > 0;
}

/** 查询用户和房源之间是否存在收藏关系。 */
export async function getFavoriteStatus(userOpenid: string, rentalId: string): Promise<FavoriteStatus> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM favorites WHERE user_openid = ? AND rental_id = ?',
    [userOpenid, rentalId]
  );
  return { isFavorited: rows.length > 0 };
}

/** 在收藏表中新增或删除记录，实现收藏状态切换。 */
export async function toggleFavorite(userOpenid: string, rentalId: string): Promise<FavoriteStatus> {
  const { isFavorited } = await getFavoriteStatus(userOpenid, rentalId);
  if (isFavorited) {
    await pool.execute('DELETE FROM favorites WHERE user_openid = ? AND rental_id = ?', [userOpenid, rentalId]);
    return { isFavorited: false };
  }
  await pool.execute(
    'INSERT INTO favorites (user_openid, rental_id, created_at) VALUES (?, ?, NOW())',
    [userOpenid, rentalId]
  );
  return { isFavorited: true };
}

/** 查询用户收藏的仍处于上架状态的房源列表。 */
export async function listFavorites(userOpenid: string): Promise<RentalListing[]> {
  const schema = await readSchema();
  const columns = getSelectColumns(schema).join(', ');
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT ${columns}
     FROM rentals r
     INNER JOIN favorites f ON r.id = f.rental_id
     WHERE f.user_openid = ? AND r.status = 1
     ORDER BY f.created_at DESC`,
    [userOpenid]
  );
  return rows.map(mapRentalRow);
}
