import type {
  CreateRentalCheckinInput,
  RentalCheckinSummary,
  RentalEventPeriod
} from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

import { ensureRentalTrustSchema } from './rental-trust-schema';

/** 用于校验故事发布者的最小数据库行。 */
interface RentalOwnerRow extends RowDataPacket {
  user_openid: string;
}

/** 计算连续居住依据所需的打卡时段和时间。 */
interface CheckinRow extends RowDataPacket {
  period: RentalEventPeriod;
  captured_at: Date | string;
}

/** 判断当前用户是否为指定故事的发布者。 */
export async function isRentalOwner(rentalId: string, userOpenid: string): Promise<boolean> {
  const [rows] = await pool.execute<RentalOwnerRow[]>(
    'SELECT user_openid FROM rentals WHERE id = ? AND user_openid = ?',
    [rentalId, userOpenid]
  );
  return rows.length > 0;
}

/** 保存一次发布后的居住微打卡。 */
export async function createRentalCheckin(
  rentalId: string,
  userOpenid: string,
  input: Omit<CreateRentalCheckinInput, 'capturedAt'> & { capturedAt: Date }
): Promise<{ id: string }> {
  await ensureRentalTrustSchema();
  const id = generateId();
  await pool.execute(
    `INSERT INTO rental_residency_checkins
      (id, rental_id, user_openid, photo_asset_id, photo_visibility, period, note, status,
       captured_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'VALID', ?, NOW())`,
    [id, rentalId, userOpenid, input.assetId, input.visibility, input.period, input.note, input.capturedAt]
  );
  return { id };
}

/** 按拍摄时间读取可计入可信依据的有效打卡。 */
export async function listValidRentalCheckins(rentalId: string): Promise<CheckinRow[]> {
  await ensureRentalTrustSchema();
  const [rows] = await pool.execute<CheckinRow[]>(
    `SELECT period, captured_at
     FROM rental_residency_checkins
     WHERE rental_id = ? AND status = 'VALID'
     ORDER BY captured_at ASC`,
    [rentalId]
  );
  return rows;
}

/**
 * 计算连续居住依据。
 * 至少三次、三个不同日期、覆盖两个时段，并且首尾间隔达到七天。
 */
export function summarizeRentalCheckins(rows: CheckinRow[]): RentalCheckinSummary {
  const timestamps = rows.map((row) => new Date(row.captured_at)).filter((date) => !Number.isNaN(date.getTime()));
  const distinctDays = new Set(timestamps.map((date) => date.toISOString().slice(0, 10)));
  const periods = [...new Set(rows.map((row) => row.period))];
  const first = timestamps[0];
  const latest = timestamps[timestamps.length - 1];
  const spansSevenDays = Boolean(first && latest && latest.getTime() - first.getTime() >= 7 * 24 * 60 * 60 * 1000);
  return {
    validCheckinCount: rows.length,
    distinctDayCount: distinctDays.size,
    coveredPeriods: periods,
    firstCheckinAt: first?.toISOString(),
    latestCheckinAt: latest?.toISOString(),
    hasContinuousResidency: rows.length >= 3 && distinctDays.size >= 3 && periods.length >= 2 && spansSevenDays
  };
}

/** 读取并计算指定故事的连续居住汇总。 */
export async function getRentalCheckinSummary(rentalId: string): Promise<RentalCheckinSummary> {
  return summarizeRentalCheckins(await listValidRentalCheckins(rentalId));
}
