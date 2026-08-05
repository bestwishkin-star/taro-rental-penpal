import type { HouseModuleId, PhotoCaptureChallenge } from '@shared/contracts/rental-space';
import type { ResultSetHeader } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

/** 创建十五分钟有效的一次性拍摄挑战。 */
export async function createCaptureChallenge(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId,
  prompt: string
): Promise<PhotoCaptureChallenge> {
  const id = generateId();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await pool.execute(
    `INSERT INTO photo_capture_challenges
      (id, user_openid, draft_id, module_type, prompt, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [id, userOpenid, draftId, module, prompt, expiresAt]
  );
  return { id, prompt, expiresAt: expiresAt.toISOString() };
}

/**
 * 原子消费拍摄挑战。
 * 所有者、草稿、点位、有效期和未使用状态必须同时匹配。
 */
export async function consumeCaptureChallenge(
  challengeId: string,
  userOpenid: string,
  draftId: string,
  module: HouseModuleId
): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE photo_capture_challenges
     SET used_at = NOW()
     WHERE id = ? AND user_openid = ? AND draft_id = ? AND module_type = ?
       AND used_at IS NULL AND expires_at >= NOW()`,
    [challengeId, userOpenid, draftId, module]
  );
  return result.affectedRows > 0;
}
