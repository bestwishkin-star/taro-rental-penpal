import { pool } from '@/lib/mysql';

/** 房屋可信依据依赖的幂等建表语句。 */
const RENTAL_TRUST_TABLE_STATEMENTS = [
  [
    'CREATE TABLE IF NOT EXISTS rental_post_proofs (',
    'id VARCHAR(36) PRIMARY KEY,',
    'rental_id VARCHAR(36) NOT NULL,',
    'user_openid VARCHAR(64) NOT NULL,',
    'file_url VARCHAR(512) NOT NULL,',
    "file_type VARCHAR(32) NOT NULL DEFAULT 'image',",
    'masked_by_user TINYINT(1) NOT NULL DEFAULT 1,',
    'created_at DATETIME NOT NULL DEFAULT NOW(),',
    'INDEX idx_rental_id (rental_id),',
    'INDEX idx_user_openid (user_openid)',
    ')'
  ].join(' '),
  [
    'CREATE TABLE IF NOT EXISTS rental_residency_checkins (',
    'id VARCHAR(36) PRIMARY KEY,',
    'rental_id VARCHAR(36) NOT NULL,',
    'user_openid VARCHAR(64) NOT NULL,',
    'photo_asset_id VARCHAR(36) NOT NULL,',
    "photo_visibility VARCHAR(32) NOT NULL DEFAULT 'VERIFICATION_ONLY',",
    'period VARCHAR(32) NOT NULL,',
    'note VARCHAR(500) NOT NULL,',
    "status VARCHAR(32) NOT NULL DEFAULT 'VALID',",
    'captured_at DATETIME NOT NULL,',
    'created_at DATETIME NOT NULL DEFAULT NOW(),',
    'INDEX idx_checkin_rental_captured (rental_id, captured_at),',
    'INDEX idx_checkin_user_created (user_openid, created_at),',
    'INDEX idx_checkin_status (status)',
    ')'
  ].join(' '),
  [
    'CREATE TABLE IF NOT EXISTS rental_proof_verifications (',
    'proof_id VARCHAR(36) PRIMARY KEY,',
    "verification_status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',",
    'verified_by VARCHAR(64),',
    'verified_at DATETIME,',
    'created_at DATETIME NOT NULL DEFAULT NOW(),',
    'updated_at DATETIME NOT NULL DEFAULT NOW(),',
    'INDEX idx_proof_verification_status (verification_status, updated_at)',
    ')'
  ].join(' ')
] as const;

/** 当前进程共享的可信依据表初始化任务。 */
let trustSchemaInitializationPromise: Promise<void> | null = null;

/** 创建旧数据库可能缺失的凭证、打卡和核验表。 */
async function initializeRentalTrustSchema(): Promise<void> {
  for (const statement of RENTAL_TRUST_TABLE_STATEMENTS) {
    await pool.execute(statement);
  }
}

/**
 * 确保房屋可信依据相关表可用。
 * 初始化失败后清除缓存，允许数据库恢复后的下一次请求重新执行。
 */
export async function ensureRentalTrustSchema(): Promise<void> {
  if (!trustSchemaInitializationPromise) {
    trustSchemaInitializationPromise = initializeRentalTrustSchema().catch((error: unknown) => {
      trustSchemaInitializationPromise = null;
      throw error;
    });
  }
  return trustSchemaInitializationPromise;
}
