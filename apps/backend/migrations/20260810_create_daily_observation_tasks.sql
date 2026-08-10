USE taro_rental_penpal;

-- 创建版本化任务模板表；已发布模板通过联合主键保留历史版本。
CREATE TABLE IF NOT EXISTS rental_daily_task_templates (
  id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  generator_type ENUM('RULE', 'AI') NOT NULL DEFAULT 'RULE',
  generator_version VARCHAR(32) NOT NULL,
  policy_version VARCHAR(32) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  task_type VARCHAR(32) NOT NULL,
  title VARCHAR(120) NOT NULL,
  prompt VARCHAR(500) NOT NULL,
  explanation_template VARCHAR(500) NOT NULL,
  estimated_seconds INT NOT NULL,
  allowed_periods JSON NOT NULL,
  evidence_requirement JSON NOT NULL,
  question_schema JSON NOT NULL,
  fact_mapping JSON NOT NULL,
  cooldown_days INT NOT NULL DEFAULT 14,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, version),
  KEY idx_daily_template_active (active, module_type, task_type)
);

-- 创建每日任务实例表；同一房屋和房主在同一自然日的每个槽位只能分配一次。
CREATE TABLE IF NOT EXISTS rental_daily_tasks (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  owner_openid VARCHAR(64) NOT NULL,
  task_date DATE NOT NULL,
  slot TINYINT NOT NULL,
  template_id VARCHAR(36) NOT NULL,
  template_version INT NOT NULL,
  status VARCHAR(24) NOT NULL,
  assignment_reason VARCHAR(500) NOT NULL,
  weight_snapshot JSON NOT NULL,
  replacement_reason VARCHAR(32),
  replacement_note VARCHAR(200),
  parent_task_id VARCHAR(36),
  started_at DATETIME(3),
  expires_at DATETIME(3) NOT NULL,
  completed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_daily_task_rental_date_slot (rental_id, task_date, slot),
  KEY idx_daily_task_template_history (rental_id, template_id, task_date)
);

-- 创建不可变观察记录表；任务和幂等键双重唯一，避免重复完成产生多条事实。
CREATE TABLE IF NOT EXISTS rental_task_observations (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  owner_openid VARCHAR(64) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  task_date DATE NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  answers JSON NOT NULL,
  measurement_values JSON NOT NULL,
  photo_asset_ids JSON NOT NULL,
  conclusion_visibility VARCHAR(16) NOT NULL,
  photo_visibility VARCHAR(16) NOT NULL,
  integrity_status VARCHAR(24) NOT NULL,
  safety_status VARCHAR(24) NOT NULL,
  household_status VARCHAR(24) NOT NULL,
  public_projection_status VARCHAR(24) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_task_observation_task (task_id),
  UNIQUE KEY uk_task_observation_idempotency (owner_openid, idempotency_key)
);

-- 创建字段级事实值表；每次观察追加新值，不覆盖历史事实。
CREATE TABLE IF NOT EXISTS rental_space_fact_values (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  fact_key VARCHAR(96) NOT NULL,
  fact_label VARCHAR(120) NOT NULL,
  normalized_value JSON NOT NULL,
  source_observation_id VARCHAR(36) NOT NULL,
  visibility VARCHAR(16) NOT NULL,
  integrity_status VARCHAR(24) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_fact_value_rental_module (rental_id, module_type, fact_key)
);

-- 创建事实双指针表；房主视图和公开视图可以推进到不同的最新事实。
CREATE TABLE IF NOT EXISTS rental_space_fact_heads (
  rental_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  fact_key VARCHAR(96) NOT NULL,
  owner_fact_value_id VARCHAR(36) NOT NULL,
  public_fact_value_id VARCHAR(36),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (rental_id, module_type, fact_key)
);

-- 创建快照活动表；同一天可以记录多个来源，但同一个每日任务只能产生一条活动。
CREATE TABLE IF NOT EXISTS rental_snapshot_activities (
  id VARCHAR(36) PRIMARY KEY,
  snapshot_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  activity_date DATE NOT NULL,
  source VARCHAR(32) NOT NULL,
  visibility VARCHAR(16) NOT NULL,
  module_type VARCHAR(32),
  task_id VARCHAR(36),
  projection_status VARCHAR(24) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_snapshot_activity_task (task_id),
  KEY idx_snapshot_activity_timeline (rental_id, activity_date)
);

-- 兼容既有拍摄挑战：新增每日任务关联，保留原有草稿挑战数据。
SET @has_capture_daily_task_id = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'photo_capture_challenges'
    AND COLUMN_NAME = 'daily_task_id'
);
SET @add_capture_daily_task_id = IF(
  @has_capture_daily_task_id = 0,
  'ALTER TABLE photo_capture_challenges ADD COLUMN daily_task_id VARCHAR(36) NULL AFTER draft_id',
  'DO 0'
);
PREPARE add_capture_daily_task_id_statement FROM @add_capture_daily_task_id;
EXECUTE add_capture_daily_task_id_statement;
DEALLOCATE PREPARE add_capture_daily_task_id_statement;

-- 记录拍摄挑战使用的任务模板版本，为后续规则升级保留审计依据。
SET @has_capture_template_version = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'photo_capture_challenges'
    AND COLUMN_NAME = 'template_version'
);
SET @add_capture_template_version = IF(
  @has_capture_template_version = 0,
  'ALTER TABLE photo_capture_challenges ADD COLUMN template_version INT NULL AFTER daily_task_id',
  'DO 0'
);
PREPARE add_capture_template_version_statement FROM @add_capture_template_version;
EXECUTE add_capture_template_version_statement;
DEALLOCATE PREPARE add_capture_template_version_statement;

-- 草稿挑战和每日任务挑战共用一张表，因此原有 draft_id 必须允许为空。
SET @capture_draft_is_required = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'photo_capture_challenges'
    AND COLUMN_NAME = 'draft_id'
    AND IS_NULLABLE = 'NO'
);
SET @make_capture_draft_nullable = IF(
  @capture_draft_is_required > 0,
  'ALTER TABLE photo_capture_challenges MODIFY COLUMN draft_id VARCHAR(36) NULL',
  'DO 0'
);
PREPARE make_capture_draft_nullable_statement FROM @make_capture_draft_nullable;
EXECUTE make_capture_draft_nullable_statement;
DEALLOCATE PREPARE make_capture_draft_nullable_statement;

-- 为每日任务拍摄挑战的归属和有效期查询建立独立索引。
SET @has_capture_daily_task_index = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'photo_capture_challenges'
    AND INDEX_NAME = 'idx_capture_challenge_daily_task'
);
SET @add_capture_daily_task_index = IF(
  @has_capture_daily_task_index = 0,
  'ALTER TABLE photo_capture_challenges ADD INDEX idx_capture_challenge_daily_task (daily_task_id, expires_at, used_at)',
  'DO 0'
);
PREPARE add_capture_daily_task_index_statement FROM @add_capture_daily_task_index;
EXECUTE add_capture_daily_task_index_statement;
DEALLOCATE PREPARE add_capture_daily_task_index_statement;

-- 数据库层保证每个拍摄挑战只归属于草稿或每日任务中的一种来源。
SET @has_capture_owner_constraint = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'photo_capture_challenges'
    AND CONSTRAINT_NAME = 'chk_capture_challenge_single_owner'
    AND CONSTRAINT_TYPE = 'CHECK'
);
SET @add_capture_owner_constraint = IF(
  @has_capture_owner_constraint = 0,
  'ALTER TABLE photo_capture_challenges ADD CONSTRAINT chk_capture_challenge_single_owner CHECK ((draft_id IS NOT NULL) <> (daily_task_id IS NOT NULL))',
  'DO 0'
);
PREPARE add_capture_owner_constraint_statement FROM @add_capture_owner_constraint;
EXECUTE add_capture_owner_constraint_statement;
DEALLOCATE PREPARE add_capture_owner_constraint_statement;
