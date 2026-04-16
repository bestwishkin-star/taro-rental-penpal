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

interface RentalDetailRow extends RentalRow {
  experience: string;
  wechat: string;
}

function safeParseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function mapStatus(status: number): RentalStatus {
  return status === 1 ? 'active' : 'inactive';
}

function toNumber(value: number | string | null): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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

async function readSchema() {
  return detectRentalLocationSchema();
}

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

export async function createRental(userOpenid: string, input: CreateRentalInput): Promise<{ id: string }> {
  const schema = await readSchema();
  const id = generateId();
  const { sql, values } = buildInsertStatement(id, userOpenid, input, schema);
  await pool.execute(sql, values);
  return { id };
}

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

export async function listMyRentals(userOpenid: string): Promise<RentalListing[]> {
  const schema = await readSchema();
  const columns = getSelectColumns(schema).join(', ');
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT ${columns} FROM rentals WHERE user_openid = ? ORDER BY created_at DESC`,
    [userOpenid]
  );
  return rows.map(mapRentalRow);
}

export async function updateRentalStatus(id: string, openid: string, status: 0 | 1): Promise<boolean> {
  const [result] = await pool.execute<import('mysql2/promise').ResultSetHeader>(
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
