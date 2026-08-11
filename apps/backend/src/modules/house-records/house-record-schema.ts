import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

/** 运行时需要补齐的 rentals 兼容字段。 */
interface RequiredRentalColumn {
  name: string;
  definition: string;
}

/** 房屋实录依赖的三张公开快照表建表语句。 */
const SNAPSHOT_TABLE_STATEMENTS = [
  [
    'CREATE TABLE IF NOT EXISTS rental_public_snapshots (',
    'id VARCHAR(36) PRIMARY KEY,',
    'rental_id VARCHAR(36) NOT NULL,',
    'owner_openid VARCHAR(64) NOT NULL,',
    'snapshot_date DATE NOT NULL,',
    'source VARCHAR(32) NOT NULL,',
    'title VARCHAR(120),',
    'content_preview VARCHAR(500),',
    'cover_photo_url VARCHAR(512),',
    'created_at DATETIME NOT NULL DEFAULT NOW(),',
    'updated_at DATETIME NOT NULL DEFAULT NOW(),',
    'UNIQUE KEY uk_rental_snapshot_date (rental_id, snapshot_date),',
    'INDEX idx_snapshot_rental_date (rental_id, snapshot_date DESC),',
    'INDEX idx_snapshot_updated (updated_at DESC)',
    ')'
  ].join(' '),
  [
    'CREATE TABLE IF NOT EXISTS rental_public_snapshot_spaces (',
    'id VARCHAR(36) PRIMARY KEY,',
    'snapshot_id VARCHAR(36) NOT NULL,',
    'module_type VARCHAR(32) NOT NULL,',
    'prompt_version VARCHAR(32) NOT NULL,',
    'scene_answers JSON,',
    'observations JSON,',
    'event_text TEXT,',
    'event_voice_url VARCHAR(512),',
    'event_occurred_period VARCHAR(32),',
    'created_at DATETIME NOT NULL DEFAULT NOW(),',
    'UNIQUE KEY uk_snapshot_space_module (snapshot_id, module_type)',
    ')'
  ].join(' '),
  [
    'CREATE TABLE IF NOT EXISTS rental_public_snapshot_photos (',
    'id VARCHAR(36) PRIMARY KEY,',
    'snapshot_space_id VARCHAR(36) NOT NULL,',
    'photo_asset_id VARCHAR(36) NOT NULL,',
    'file_url VARCHAR(512) NOT NULL,',
    'sort_order INT UNSIGNED NOT NULL,',
    'created_at DATETIME NOT NULL DEFAULT NOW(),',
    'UNIQUE KEY uk_snapshot_space_photo (snapshot_space_id, photo_asset_id)',
    ')'
  ].join(' ')
] as const;

/** 首次发布和发现查询依赖的 rentals 增量字段。 */
const REQUIRED_RENTAL_COLUMNS: readonly RequiredRentalColumn[] = [
  { name: 'title', definition: "title VARCHAR(120) NOT NULL DEFAULT ''" },
  { name: 'proof_status', definition: "proof_status VARCHAR(32) NOT NULL DEFAULT 'none'" },
  { name: 'post_status', definition: "post_status VARCHAR(32) NOT NULL DEFAULT 'active'" }
];

/** 旧公开快照表可能缺少的发现页展示字段。 */
const REQUIRED_SNAPSHOT_COLUMNS: readonly RequiredRentalColumn[] = [
  { name: 'title', definition: 'title VARCHAR(120) NULL' },
  { name: 'content_preview', definition: 'content_preview VARCHAR(500) NULL' },
  { name: 'cover_photo_url', definition: 'cover_photo_url VARCHAR(512) NULL' }
];

/** 当前进程共享的初始化任务，避免并发请求重复执行 DDL。 */
let schemaInitializationPromise: Promise<void> | null = null;

/** 判断 MySQL 错误是否为并发补列产生的重复字段错误。 */
function isDuplicateColumnError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'errno' in error && error.errno === 1060;
}

/** 按实际表结构补齐一组字段，并兼容多实例同时初始化。 */
async function addMissingColumns(
  tableName: 'rentals' | 'rental_public_snapshots',
  requiredColumns: readonly RequiredRentalColumn[]
): Promise<void> {
  const [columnRows] = await pool.execute<RowDataPacket[]>('SHOW COLUMNS FROM ' + tableName);
  const existingColumns = new Set(columnRows.map((row) => String(row.Field)));
  for (const column of requiredColumns) {
    if (existingColumns.has(column.name)) continue;
    try {
      await pool.execute('ALTER TABLE ' + tableName + ' ADD COLUMN ' + column.definition);
    } catch (error: unknown) {
      if (!isDuplicateColumnError(error)) throw error;
    }
  }
}

/** 创建公开快照表，并补齐旧 rentals 表缺少的发布字段。 */
async function initializeHouseRecordSnapshotSchema(): Promise<void> {
  for (const statement of SNAPSHOT_TABLE_STATEMENTS) {
    await pool.execute(statement);
  }

  await addMissingColumns('rentals', REQUIRED_RENTAL_COLUMNS);
  await addMissingColumns('rental_public_snapshots', REQUIRED_SNAPSHOT_COLUMNS);
}

/**
 * 确保房屋实录数据库结构可用。
 * 初始化失败后清除缓存，允许下一次请求在数据库恢复后重试。
 */
export async function ensureHouseRecordSnapshotSchema(): Promise<void> {
  if (!schemaInitializationPromise) {
    schemaInitializationPromise = initializeHouseRecordSnapshotSchema().catch((error: unknown) => {
      schemaInitializationPromise = null;
      throw error;
    });
  }
  return schemaInitializationPromise;
}
