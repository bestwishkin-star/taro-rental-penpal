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

interface RentalRow extends RowDataPacket {
  id: string;
  price: string;
  location: string;
  room_type: string;
  area: string;
  tags: string;
  photos: string;
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

export async function getRentalById(id: string): Promise<RentalDetail | null> {
  const [rows] = await pool.execute<RentalDetailRow[]>(
    'SELECT id, price, location, room_type, area, tags, photos, experience, wechat, status FROM rentals WHERE id = ? AND status = 1',
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    title: `${row.room_type} · ${row.location}`,
    location: row.location,
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    tags: safeParseArray(row.tags),
    photos: safeParseArray(row.photos),
    status: mapStatus(row.status),
    experience: row.experience,
    wechat: row.wechat
  };
}

export async function createRental(
  userOpenid: string,
  input: CreateRentalInput
): Promise<{ id: string }> {
  const id = generateId();
  await pool.execute(
    `INSERT INTO rentals
      (id, user_openid, price, location, room_type, area, experience, tags, wechat, photos, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [
      id,
      userOpenid,
      input.price,
      input.location,
      input.roomType,
      input.area ?? '',
      input.experience,
      JSON.stringify(input.tags),
      input.wechat ?? '',
      JSON.stringify(input.photos)
    ]
  );
  return { id };
}

export async function listRentals(query: ListRentalsQuery = {}): Promise<RentalListing[]> {
  const { keyword, filter, sort, priceRange } = query;
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize ?? '10', 10) || 10));
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['status = 1'];
  const params: (string | number)[] = [];

  if (keyword) {
    conditions.push('location LIKE ?');
    params.push(`%${keyword}%`);
  }

  if (filter === 'whole') {
    conditions.push('room_type = ?');
    params.push('整租');
  } else if (filter === 'shared') {
    conditions.push('room_type = ?');
    params.push('合租');
  } else if (filter === 'single') {
    conditions.push('room_type = ?');
    params.push('单间');
  } else if (filter === 'subway') {
    conditions.push("JSON_SEARCH(tags, 'one', '交通便利') IS NOT NULL");
  }

  if (priceRange === 'lt2000') {
    conditions.push('CAST(price AS UNSIGNED) < 2000');
  } else if (priceRange === '2000to4000') {
    conditions.push('CAST(price AS UNSIGNED) BETWEEN 2000 AND 4000');
  } else if (priceRange === 'gt4000') {
    conditions.push('CAST(price AS UNSIGNED) > 4000');
  }

  let orderBy = 'created_at DESC';
  if (sort === 'price_asc') orderBy = 'CAST(price AS DECIMAL(10,2)) ASC';
  else if (sort === 'price_desc') orderBy = 'CAST(price AS DECIMAL(10,2)) DESC';

  const where = conditions.join(' AND ');
  // pageSize 和 offset 已经过 parseInt + Math 验证为安全整数，直接内联避免 mysql2 二进制协议类型冲突
  const sql = `SELECT id, price, location, room_type, area, tags, photos, status FROM rentals WHERE ${where} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;

  const [rows] = await pool.execute<RentalRow[]>(sql, params);

  return rows.map((row) => ({
    id: row.id,
    title: `${row.room_type} · ${row.location}`,
    location: row.location,
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    tags: safeParseArray(row.tags),
    photos: safeParseArray(row.photos),
    status: mapStatus(row.status)
  }));
}

export async function listMyRentals(userOpenid: string): Promise<RentalListing[]> {
  const [rows] = await pool.execute<RentalRow[]>(
    'SELECT id, price, location, room_type, area, tags, photos, status FROM rentals WHERE user_openid = ? ORDER BY created_at DESC',
    [userOpenid]
  );
  return rows.map((row) => ({
    id: row.id,
    title: `${row.room_type} · ${row.location}`,
    location: row.location,
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    tags: safeParseArray(row.tags),
    photos: safeParseArray(row.photos),
    status: mapStatus(row.status)
  }));
}

export async function updateRentalStatus(
  id: string,
  openid: string,
  status: 0 | 1
): Promise<boolean> {
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
  const [rows] = await pool.execute<RentalRow[]>(
    `SELECT r.id, r.price, r.location, r.room_type, r.area, r.tags, r.photos, r.status
     FROM rentals r
     INNER JOIN favorites f ON r.id = f.rental_id
     WHERE f.user_openid = ? AND r.status = 1
     ORDER BY f.created_at DESC`,
    [userOpenid]
  );
  return rows.map((row) => ({
    id: row.id,
    title: `${row.room_type} · ${row.location}`,
    location: row.location,
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    tags: safeParseArray(row.tags),
    photos: safeParseArray(row.photos),
    status: mapStatus(row.status)
  }));
}
