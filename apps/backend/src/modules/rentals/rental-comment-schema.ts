import { pool } from '@/lib/mysql';

/** 屋檐故事公开评论表的幂等建表语句。 */
const RENTAL_COMMENT_TABLE_STATEMENT = [
  'CREATE TABLE IF NOT EXISTS rental_post_comments (',
  'id VARCHAR(36) PRIMARY KEY,',
  'rental_id VARCHAR(36) NOT NULL,',
  'user_openid VARCHAR(64) NOT NULL,',
  'content TEXT NOT NULL,',
  "status VARCHAR(32) NOT NULL DEFAULT 'active',",
  'created_at DATETIME NOT NULL DEFAULT NOW(),',
  'updated_at DATETIME NOT NULL DEFAULT NOW(),',
  'INDEX idx_rental_created (rental_id, created_at),',
  'INDEX idx_user_openid (user_openid)',
  ')'
].join(' ');

/** 当前进程共享的评论表初始化任务。 */
let commentSchemaInitializationPromise: Promise<void> | null = null;

/** 创建旧数据库可能缺失的公开评论表。 */
async function initializeRentalCommentSchema(): Promise<void> {
  await pool.execute(RENTAL_COMMENT_TABLE_STATEMENT);
}

/**
 * 确保评论表可用。
 * 初始化失败后清除缓存，允许数据库恢复后的下一次请求重新执行。
 */
export async function ensureRentalCommentSchema(): Promise<void> {
  if (!commentSchemaInitializationPromise) {
    commentSchemaInitializationPromise = initializeRentalCommentSchema().catch((error: unknown) => {
      commentSchemaInitializationPromise = null;
      throw error;
    });
  }
  return commentSchemaInitializationPromise;
}
