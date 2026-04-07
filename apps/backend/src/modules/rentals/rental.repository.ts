import { randomUUID } from 'node:crypto';

import type { RowDataPacket } from 'mysql2/promise';

import type { CreateRentalInput, ListRentalsQuery, RentalListing } from '@shared/contracts/rental';

import { pool } from '@/lib/mysql';

interface RentalRow extends RowDataPacket {
  id: string;
  price: string;
  location: string;
  room_type: string;
  area: string;
  tags: string;
  photos: string;
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

export async function createRental(
  userOpenid: string,
  input: CreateRentalInput
): Promise<{ id: string }> {
  const id = randomUUID();
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
  const { keyword, filter, sort } = query;
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize ?? '10', 10) || 10));
  const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['status = 1'];
  const params: string[] = [];

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
  } else if (filter === 'subway') {
    conditions.push("JSON_SEARCH(tags, 'one', '交通便利') IS NOT NULL");
  }

  let orderBy = 'created_at DESC';
  if (sort === 'price_asc') orderBy = 'CAST(price AS DECIMAL(10,2)) ASC';
  else if (sort === 'price_desc') orderBy = 'CAST(price AS DECIMAL(10,2)) DESC';

  const where = conditions.join(' AND ');
  // pageSize 和 offset 已经过 parseInt + Math 验证为安全整数，直接内联避免 mysql2 二进制协议类型冲突
  const sql = `SELECT id, price, location, room_type, area, tags, photos FROM rentals WHERE ${where} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`;

  const [rows] = await pool.execute<RentalRow[]>(sql, params);

  return rows.map((row) => ({
    id: row.id,
    title: `${row.room_type} · ${row.location}`,
    location: row.location,
    price: row.price,
    area: row.area,
    roomType: row.room_type,
    tags: safeParseArray(row.tags),
    photos: safeParseArray(row.photos)
  }));
}
