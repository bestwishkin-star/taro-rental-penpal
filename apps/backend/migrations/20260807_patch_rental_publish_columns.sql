USE taro_rental_penpal;

-- 兼容早期 rentals 表：首次发布房屋实录时需要写入标题和社区审核状态。
-- 每个字段均先查询 information_schema，保证本迁移可以被重复执行。

-- 补齐屋檐故事标题字段。
SET @has_rental_title = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rentals'
    AND COLUMN_NAME = 'title'
);
SET @patch_rental_title = IF(
  @has_rental_title = 0,
  'ALTER TABLE rentals ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT '''' AFTER user_openid',
  'DO 0'
);
PREPARE patch_rental_title_statement FROM @patch_rental_title;
EXECUTE patch_rental_title_statement;
DEALLOCATE PREPARE patch_rental_title_statement;

-- 补齐居住凭证提交状态。
SET @has_rental_proof_status = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rentals'
    AND COLUMN_NAME = 'proof_status'
);
SET @patch_rental_proof_status = IF(
  @has_rental_proof_status = 0,
  'ALTER TABLE rentals ADD COLUMN proof_status VARCHAR(32) NOT NULL DEFAULT ''none'' AFTER photos',
  'DO 0'
);
PREPARE patch_rental_proof_status_statement FROM @patch_rental_proof_status;
EXECUTE patch_rental_proof_status_statement;
DEALLOCATE PREPARE patch_rental_proof_status_statement;

-- 补齐社区内容审核状态。
SET @has_rental_post_status = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'rentals'
    AND COLUMN_NAME = 'post_status'
);
SET @patch_rental_post_status = IF(
  @has_rental_post_status = 0,
  'ALTER TABLE rentals ADD COLUMN post_status VARCHAR(32) NOT NULL DEFAULT ''active'' AFTER proof_status',
  'DO 0'
);
PREPARE patch_rental_post_status_statement FROM @patch_rental_post_status;
EXECUTE patch_rental_post_status_statement;
DEALLOCATE PREPARE patch_rental_post_status_statement;
