USE taro_rental_penpal;

-- 兼容早期已创建的公开快照表：CREATE TABLE IF NOT EXISTS 不会为旧表自动补齐新增列。
-- 每个字段均先查询 information_schema，保证本迁移可以被重复执行。

-- 补齐房屋实录标题字段。
SET @has_snapshot_title = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rental_public_snapshots'
    AND COLUMN_NAME = 'title'
);
SET @patch_snapshot_title = IF(
  @has_snapshot_title = 0,
  'ALTER TABLE rental_public_snapshots ADD COLUMN title VARCHAR(120) NULL AFTER source',
  'DO 0'
);
PREPARE patch_snapshot_title_statement FROM @patch_snapshot_title;
EXECUTE patch_snapshot_title_statement;
DEALLOCATE PREPARE patch_snapshot_title_statement;

-- 补齐发现页使用的正文摘要字段。
SET @has_snapshot_content_preview = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rental_public_snapshots'
    AND COLUMN_NAME = 'content_preview'
);
SET @patch_snapshot_content_preview = IF(
  @has_snapshot_content_preview = 0,
  'ALTER TABLE rental_public_snapshots ADD COLUMN content_preview VARCHAR(500) NULL AFTER title',
  'DO 0'
);
PREPARE patch_snapshot_content_preview_statement FROM @patch_snapshot_content_preview;
EXECUTE patch_snapshot_content_preview_statement;
DEALLOCATE PREPARE patch_snapshot_content_preview_statement;

-- 补齐发现页和时间线使用的封面字段。
SET @has_snapshot_cover_photo_url = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rental_public_snapshots'
    AND COLUMN_NAME = 'cover_photo_url'
);
SET @patch_snapshot_cover_photo_url = IF(
  @has_snapshot_cover_photo_url = 0,
  'ALTER TABLE rental_public_snapshots ADD COLUMN cover_photo_url VARCHAR(512) NULL AFTER content_preview',
  'DO 0'
);
PREPARE patch_snapshot_cover_photo_url_statement FROM @patch_snapshot_cover_photo_url;
EXECUTE patch_snapshot_cover_photo_url_statement;
DEALLOCATE PREPARE patch_snapshot_cover_photo_url_statement;
