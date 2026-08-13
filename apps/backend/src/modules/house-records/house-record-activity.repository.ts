import type {
  DailyTaskVisibility,
  PublicProjectionStatus
} from '@shared/contracts/daily-task';
import type { RentalSnapshotSource } from '@shared/contracts/house-record';
import type { HouseModuleId } from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

import type { HouseRecordDateRange } from './house-record.types';

/** 成长树活动聚合前的单条数据库行。 */
interface TimelineActivityRow extends RowDataPacket {
  activity_date: string;
  source: RentalSnapshotSource;
  visibility: DailyTaskVisibility;
  module_type: HouseModuleId | null;
  projection_status: PublicProjectionStatus;
}

/** Service 合并同日快照时使用的活动记录。 */
export interface HouseRecordTimelineActivity {
  snapshotDate: string;
  source: RentalSnapshotSource;
  visibility: DailyTaskVisibility;
  module?: HouseModuleId;
  projectionStatus: PublicProjectionStatus;
}

/** 判断数据库错误是否表示可选的成长树活动表尚未迁移。 */
function isMissingActivityTableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const databaseError = error as { code?: unknown; errno?: unknown };
  return databaseError.code === 'ER_NO_SUCH_TABLE' || databaseError.errno === 1146;
}

/** 一次查询读取日期窗口内全部快照活动，不返回观察答案或照片。 */
export async function listTimelineActivities(
  rentalId: string,
  range: HouseRecordDateRange
): Promise<HouseRecordTimelineActivity[]> {
  let rows: TimelineActivityRow[];
  try {
    [rows] = await pool.execute<TimelineActivityRow[]>(
      `SELECT DATE_FORMAT(activity_date, '%Y-%m-%d') AS activity_date,
              source,
              visibility,
              module_type,
              projection_status
       FROM rental_snapshot_activities
       WHERE rental_id = ? AND activity_date BETWEEN ? AND ?
       ORDER BY activity_date DESC, created_at ASC`,
      [rentalId, range.start, range.end]
    );
  } catch (error: unknown) {
    // 每日任务迁移尚未执行时，保留原有公开快照成长树，不让增强数据阻断页面。
    if (isMissingActivityTableError(error)) return [];
    throw error;
  }
  return rows.map((row) => ({
    snapshotDate: row.activity_date,
    source: row.source,
    visibility: row.visibility,
    module: row.module_type ?? undefined,
    projectionStatus: row.projection_status
  }));
}

/** 判断当前登录用户是否为指定房屋房主。 */
export async function isHouseRecordOwner(
  rentalId: string,
  viewerOpenid?: string
): Promise<boolean> {
  if (!viewerOpenid) return false;
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM rentals WHERE id = ? AND user_openid = ? LIMIT 1',
    [rentalId, viewerOpenid]
  );
  return rows.length > 0;
}
