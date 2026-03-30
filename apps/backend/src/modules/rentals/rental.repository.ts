import type { RowDataPacket } from 'mysql2/promise';

import type { RentalListing } from '@shared/contracts/rental';

import { pool } from '@/lib/mysql';

interface RentalRow extends RowDataPacket {
  id: string;
  title: string;
  district: string;
  price: string;
  meta: string;
  tags: string;
}

const fallbackListings: RentalListing[] = [
  {
    id: 'rental-1',
    title: 'Metro-ready one bedroom with bright living room',
    district: 'Chaoyang',
    price: 'CNY 4,500 / month',
    meta: 'Near line 6, available in 3 days, landlord verified',
    tags: ['Near subway', 'Pet friendly', 'Flexible lease']
  },
  {
    id: 'rental-2',
    title: 'Shared apartment for two tidy roommates',
    district: 'Pudong',
    price: 'CNY 3,200 / room',
    meta: 'Independent bathroom, coworking nearby, move in anytime',
    tags: ['Roommate match', 'Bills split', 'Quiet community']
  },
  {
    id: 'rental-3',
    title: 'Studio for solo renters with work-from-home setup',
    district: 'Yuhang',
    price: 'CNY 3,900 / month',
    meta: 'Desk included, elevator building, one month deposit',
    tags: ['WFH setup', 'Elevator', 'Low deposit']
  }
];

export async function listRentals(): Promise<RentalListing[]> {
  try {
    const [rows] = await pool.execute<RentalRow[]>(
      'SELECT id, title, district, price, meta, tags FROM rentals LIMIT 20'
    );

    if (rows.length === 0) return fallbackListings;

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      district: row.district,
      price: row.price,
      meta: row.meta,
      tags: row.tags ? (JSON.parse(row.tags) as string[]) : []
    }));
  } catch {
    return fallbackListings;
  }
}
