import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

/** 每日观察完整流程依赖的幂等建表语句。 */
const DAILY_TASK_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS rental_daily_task_templates (
    id VARCHAR(36) NOT NULL, version INT NOT NULL, generator_type VARCHAR(16) NOT NULL,
    generator_version VARCHAR(32) NOT NULL, policy_version VARCHAR(32) NOT NULL,
    module_type VARCHAR(32) NOT NULL, task_type VARCHAR(32) NOT NULL, title VARCHAR(120) NOT NULL,
    prompt VARCHAR(500) NOT NULL, explanation_template VARCHAR(500) NOT NULL,
    estimated_seconds INT NOT NULL, allowed_periods JSON NOT NULL, evidence_requirement JSON NOT NULL,
    question_schema JSON NOT NULL, fact_mapping JSON NOT NULL, cooldown_days INT NOT NULL DEFAULT 14,
    active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id, version), KEY idx_daily_template_active (active, module_type, task_type)
  )`,
  `CREATE TABLE IF NOT EXISTS rental_daily_tasks (
    id VARCHAR(36) PRIMARY KEY, rental_id VARCHAR(36) NOT NULL, owner_openid VARCHAR(64) NOT NULL,
    task_date DATE NOT NULL, slot TINYINT NOT NULL, template_id VARCHAR(36) NOT NULL,
    template_version INT NOT NULL, status VARCHAR(24) NOT NULL, assignment_reason VARCHAR(500) NOT NULL,
    weight_snapshot JSON NOT NULL, replacement_reason VARCHAR(32), replacement_note VARCHAR(200),
    parent_task_id VARCHAR(36), started_at DATETIME(3), expires_at DATETIME(3) NOT NULL,
    completed_at DATETIME(3), created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_daily_task_rental_date_slot (rental_id, task_date, slot),
    KEY idx_daily_task_template_history (rental_id, template_id, task_date)
  )`,
  `CREATE TABLE IF NOT EXISTS rental_task_observations (
    id VARCHAR(36) PRIMARY KEY, task_id VARCHAR(36) NOT NULL, rental_id VARCHAR(36) NOT NULL,
    owner_openid VARCHAR(64) NOT NULL, module_type VARCHAR(32) NOT NULL, task_date DATE NOT NULL,
    idempotency_key VARCHAR(64) NOT NULL, answers JSON NOT NULL, measurement_values JSON NOT NULL,
    photo_asset_ids JSON NOT NULL, conclusion_visibility VARCHAR(16) NOT NULL,
    photo_visibility VARCHAR(16) NOT NULL, integrity_status VARCHAR(24) NOT NULL,
    safety_status VARCHAR(24) NOT NULL, household_status VARCHAR(24) NOT NULL,
    public_projection_status VARCHAR(24) NOT NULL, observed_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_task_observation_task (task_id),
    UNIQUE KEY uk_task_observation_idempotency (owner_openid, idempotency_key)
  )`,
  `CREATE TABLE IF NOT EXISTS rental_space_fact_values (
    id VARCHAR(36) PRIMARY KEY, rental_id VARCHAR(36) NOT NULL, module_type VARCHAR(32) NOT NULL,
    fact_key VARCHAR(96) NOT NULL, fact_label VARCHAR(120) NOT NULL, normalized_value JSON NOT NULL,
    source_observation_id VARCHAR(36) NOT NULL, visibility VARCHAR(16) NOT NULL,
    integrity_status VARCHAR(24) NOT NULL, observed_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_fact_value_rental_module (rental_id, module_type, fact_key)
  )`,
  `CREATE TABLE IF NOT EXISTS rental_space_fact_heads (
    rental_id VARCHAR(36) NOT NULL, module_type VARCHAR(32) NOT NULL, fact_key VARCHAR(96) NOT NULL,
    owner_fact_value_id VARCHAR(36) NOT NULL, public_fact_value_id VARCHAR(36),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (rental_id, module_type, fact_key)
  )`,
  `CREATE TABLE IF NOT EXISTS rental_snapshot_activities (
    id VARCHAR(36) PRIMARY KEY, snapshot_id VARCHAR(36) NOT NULL, rental_id VARCHAR(36) NOT NULL,
    activity_date DATE NOT NULL, source VARCHAR(32) NOT NULL, visibility VARCHAR(16) NOT NULL,
    module_type VARCHAR(32), task_id VARCHAR(36), projection_status VARCHAR(24) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_snapshot_activity_task (task_id),
    KEY idx_snapshot_activity_timeline (rental_id, activity_date)
  )`,
  `CREATE TABLE IF NOT EXISTS photo_capture_challenges (
    id VARCHAR(36) PRIMARY KEY, user_openid VARCHAR(64) NOT NULL, draft_id VARCHAR(36),
    daily_task_id VARCHAR(36), template_version INT, module_type VARCHAR(32) NOT NULL,
    prompt VARCHAR(500) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_capture_challenge_owner (user_openid, draft_id, module_type, expires_at),
    KEY idx_capture_challenge_expiry (expires_at, used_at),
    KEY idx_capture_challenge_daily_task (daily_task_id, expires_at, used_at)
  )`
] as const;

/** SHOW COLUMNS 返回的拍摄挑战字段信息。 */
interface CaptureColumnRow extends RowDataPacket {
  Field: string;
  Null: 'YES' | 'NO';
}

/** SHOW INDEX 返回的索引名称。 */
interface IndexRow extends RowDataPacket {
  Key_name: string;
}

/** 当前进程共享的每日任务结构初始化任务。 */
let schemaInitializationPromise: Promise<void> | null = null;

/** 判断 DDL 是否因其他实例已完成相同操作而产生可忽略竞态。 */
function isIgnorableDdlRace(error: unknown, errnos: readonly number[]): boolean {
  return typeof error === 'object' && error !== null && 'errno' in error &&
    errnos.includes(Number(error.errno));
}

/** 为旧拍摄挑战表补齐每日任务字段、空值约束和查询索引。 */
async function patchCaptureChallengeSchema(): Promise<void> {
  const [columnRows] = await pool.execute<CaptureColumnRow[]>('SHOW COLUMNS FROM photo_capture_challenges');
  const columns = new Map(columnRows.map((row) => [row.Field, row]));
  for (const [name, definition] of [
    ['daily_task_id', 'daily_task_id VARCHAR(36) NULL'],
    ['template_version', 'template_version INT NULL']
  ] as const) {
    if (columns.has(name)) continue;
    try {
      await pool.execute('ALTER TABLE photo_capture_challenges ADD COLUMN ' + definition);
    } catch (error: unknown) {
      if (!isIgnorableDdlRace(error, [1060])) throw error;
    }
  }

  if (columns.get('draft_id')?.Null === 'NO') {
    await pool.execute('ALTER TABLE photo_capture_challenges MODIFY COLUMN draft_id VARCHAR(36) NULL');
  }

  const [indexRows] = await pool.execute<IndexRow[]>('SHOW INDEX FROM photo_capture_challenges');
  if (!indexRows.some((row) => row.Key_name === 'idx_capture_challenge_daily_task')) {
    try {
      await pool.execute(
        'ALTER TABLE photo_capture_challenges ADD INDEX idx_capture_challenge_daily_task (daily_task_id, expires_at, used_at)'
      );
    } catch (error: unknown) {
      if (!isIgnorableDdlRace(error, [1061])) throw error;
    }
  }
}

/** 清理早期按房主限制任务槽位的错误唯一索引。 */
async function dropLegacyOwnerSlotIndex(): Promise<void> {
  const [indexRows] = await pool.execute<IndexRow[]>('SHOW INDEX FROM rental_daily_tasks');
  if (!indexRows.some((row) => row.Key_name === 'uk_daily_task_owner_date_slot')) return;
  try {
    await pool.execute('ALTER TABLE rental_daily_tasks DROP INDEX uk_daily_task_owner_date_slot');
  } catch (error: unknown) {
    if (!isIgnorableDdlRace(error, [1091])) throw error;
  }
}

/** 创建每日观察全链路表并修补旧拍摄挑战结构。 */
async function initializeDailyTaskSchema(): Promise<void> {
  for (const statement of DAILY_TASK_TABLE_STATEMENTS) await pool.execute(statement);
  await patchCaptureChallengeSchema();
  await dropLegacyOwnerSlotIndex();
}

/** 确保每日观察数据库结构可用，失败后允许下一次请求重新初始化。 */
export async function ensureDailyTaskSchema(): Promise<void> {
  if (!schemaInitializationPromise) {
    schemaInitializationPromise = initializeDailyTaskSchema().catch((error: unknown) => {
      schemaInitializationPromise = null;
      throw error;
    });
  }
  return schemaInitializationPromise;
}
