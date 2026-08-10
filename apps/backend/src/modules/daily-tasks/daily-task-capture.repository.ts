import type { HouseModuleId, PhotoCaptureChallenge } from '@shared/contracts/rental-space';
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

/** 每日任务现场拍摄挑战的固定有效时长。 */
const DAILY_TASK_CHALLENGE_TTL_MS = 15 * 60 * 1000;

/** 创建与每日任务模板版本绑定的十五分钟一次性拍摄挑战。 */
export async function createDailyTaskCaptureChallenge(
  userOpenid: string,
  taskId: string,
  module: HouseModuleId,
  templateVersion: number,
  prompt: string
): Promise<PhotoCaptureChallenge> {
  const id = generateId();
  const expiresAt = new Date(Date.now() + DAILY_TASK_CHALLENGE_TTL_MS);
  await pool.execute(
    `INSERT INTO photo_capture_challenges
      (id, user_openid, draft_id, daily_task_id, template_version,
       module_type, prompt, expires_at, created_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NOW())`,
    [id, userOpenid, taskId, templateVersion, module, prompt, expiresAt]
  );
  return { id, prompt, expiresAt: expiresAt.toISOString() };
}

/**
 * 在完成任务事务中原子消费每日任务拍摄挑战。
 * 所有者、任务、空间、模板版本、有效期和未使用状态必须同时匹配。
 */
export async function consumeDailyTaskCaptureChallenge(
  connection: PoolConnection,
  challengeId: string,
  userOpenid: string,
  taskId: string,
  module: HouseModuleId,
  templateVersion: number,
  consumedAt: Date
): Promise<boolean> {
  const [result] = await connection.execute<ResultSetHeader>(
    `UPDATE photo_capture_challenges
     SET used_at = ?
     WHERE id = ?
       AND user_openid = ?
       AND daily_task_id = ?
       AND module_type = ?
       AND template_version = ?
       AND used_at IS NULL
       AND expires_at >= ?`,
    [consumedAt, challengeId, userOpenid, taskId, module, templateVersion, consumedAt]
  );
  return result.affectedRows === 1;
}
