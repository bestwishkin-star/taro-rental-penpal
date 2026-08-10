CREATE DATABASE IF NOT EXISTS taro_rental_penpal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE taro_rental_penpal;

CREATE TABLE IF NOT EXISTS users (
  openid VARCHAR(64) PRIMARY KEY,
  nickname VARCHAR(64) NOT NULL DEFAULT '租房用户',
  avatar_url VARCHAR(512) NOT NULL DEFAULT '',
  token VARCHAR(64),
  budget VARCHAR(64),
  city VARCHAR(64),
  preferred_district VARCHAR(64),
  move_in_date VARCHAR(32),
  roommate_expectation TEXT,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  time VARCHAR(32) NOT NULL,
  topic VARCHAR(128) NOT NULL,
  last_message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rentals (
  id VARCHAR(36) PRIMARY KEY,
  user_openid VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL DEFAULT '',
  price VARCHAR(50) NOT NULL,
  location VARCHAR(255) NOT NULL,
  province VARCHAR(64),
  city VARCHAR(64),
  district VARCHAR(64),
  address VARCHAR(255),
  landmark VARCHAR(255),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  room_type VARCHAR(20) NOT NULL,
  rental_type VARCHAR(32) NOT NULL DEFAULT 'shared',
  stay_stage VARCHAR(32) NOT NULL DEFAULT 'living',
  area VARCHAR(50) NOT NULL DEFAULT '',
  commute VARCHAR(255) NOT NULL DEFAULT '',
  experience TEXT NOT NULL,
  tags JSON,
  wechat VARCHAR(100) NOT NULL DEFAULT '',
  photos JSON,
  proof_status VARCHAR(32) NOT NULL DEFAULT 'none',
  post_status VARCHAR(32) NOT NULL DEFAULT 'active',
  comment_count INT UNSIGNED NOT NULL DEFAULT 0,
  favorite_count INT UNSIGNED NOT NULL DEFAULT 0,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_user_openid (user_openid),
  INDEX idx_region (province, city, district),
  INDEX idx_status_created (status, created_at),
  INDEX idx_post_status_created (post_status, created_at),
  INDEX idx_city_district (city, district)
);

CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_openid VARCHAR(64) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_user_rental (user_openid, rental_id),
  INDEX idx_user_openid (user_openid)
);

CREATE TABLE IF NOT EXISTS rental_post_proofs (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  user_openid VARCHAR(64) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  file_type VARCHAR(32) NOT NULL DEFAULT 'image',
  masked_by_user TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_rental_id (rental_id),
  INDEX idx_user_openid (user_openid)
);

CREATE TABLE IF NOT EXISTS rental_post_comments (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  user_openid VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_rental_created (rental_id, created_at),
  INDEX idx_user_openid (user_openid)
);

CREATE TABLE IF NOT EXISTS rental_post_reports (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  reporter_openid VARCHAR(64) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  evidence_photos JSON,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  handled_by VARCHAR(64),
  handled_note TEXT,
  handled_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_rental_id (rental_id),
  INDEX idx_status_created (status, created_at),
  INDEX idx_reporter_openid (reporter_openid)
);

CREATE TABLE IF NOT EXISTS photo_assets (
  id VARCHAR(36) PRIMARY KEY,
  owner_openid VARCHAR(64) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  width INT UNSIGNED,
  height INT UNSIGNED,
  content_hash CHAR(64) NOT NULL,
  perceptual_hash CHAR(64),
  upload_source VARCHAR(32) NOT NULL DEFAULT 'OTHER',
  safety_status VARCHAR(32) NOT NULL DEFAULT 'UNCHECKED',
  household_status VARCHAR(32) NOT NULL DEFAULT 'UNCHECKED',
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_photo_owner_created (owner_openid, created_at),
  INDEX idx_photo_content_hash (content_hash),
  INDEX idx_photo_safety_status (safety_status),
  INDEX idx_photo_household_status (household_status)
);

CREATE TABLE IF NOT EXISTS photo_analysis_jobs (
  id VARCHAR(36) PRIMARY KEY,
  photo_asset_id VARCHAR(36) NOT NULL,
  analysis_type VARCHAR(48) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  provider VARCHAR(64),
  model_version VARCHAR(128),
  policy_version VARCHAR(128),
  reference_scope VARCHAR(128),
  result_code VARCHAR(64),
  risk_level VARCHAR(32),
  signals JSON,
  provider_payload JSON,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  next_retry_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  started_at DATETIME,
  finished_at DATETIME,
  INDEX idx_analysis_asset_type (photo_asset_id, analysis_type),
  INDEX idx_analysis_status_retry (status, next_retry_at)
);

CREATE TABLE IF NOT EXISTS rental_story_drafts (
  id VARCHAR(36) PRIMARY KEY,
  user_openid VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  published_rental_id VARCHAR(36),
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  published_at DATETIME,
  INDEX idx_draft_user_status_updated (user_openid, status, updated_at),
  INDEX idx_draft_published_rental (published_rental_id)
);

CREATE TABLE IF NOT EXISTS rental_space_records (
  id VARCHAR(36) PRIMARY KEY,
  draft_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  prompt_version VARCHAR(32) NOT NULL,
  scene_answers JSON,
  event_text TEXT,
  event_voice_url VARCHAR(512),
  event_occurred_period VARCHAR(32),
  is_slice_confirmed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_space_record_draft_module (draft_id, module_type),
  INDEX idx_space_record_draft_completed (draft_id, completed_at)
);

CREATE TABLE IF NOT EXISTS rental_space_photos (
  id VARCHAR(36) PRIMARY KEY,
  space_record_id VARCHAR(36) NOT NULL,
  photo_asset_id VARCHAR(36) NOT NULL,
  visibility VARCHAR(32) NOT NULL DEFAULT 'VERIFICATION_ONLY',
  capture_challenge_id VARCHAR(36),
  captured_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_space_photo_record_asset (space_record_id, photo_asset_id),
  INDEX idx_space_photo_record_created (space_record_id, created_at),
  INDEX idx_space_photo_asset (photo_asset_id)
);

CREATE TABLE IF NOT EXISTS photo_capture_challenges (
  id VARCHAR(36) PRIMARY KEY,
  user_openid VARCHAR(64) NOT NULL,
  draft_id VARCHAR(36),
  daily_task_id VARCHAR(36),
  template_version INT,
  module_type VARCHAR(32) NOT NULL,
  prompt VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_capture_challenge_owner (user_openid, draft_id, module_type, expires_at),
  INDEX idx_capture_challenge_expiry (expires_at, used_at),
  INDEX idx_capture_challenge_daily_task (daily_task_id, expires_at, used_at),
  CONSTRAINT chk_capture_challenge_single_owner
    CHECK ((draft_id IS NOT NULL) <> (daily_task_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS rental_residency_checkins (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  user_openid VARCHAR(64) NOT NULL,
  photo_asset_id VARCHAR(36) NOT NULL,
  photo_visibility VARCHAR(32) NOT NULL DEFAULT 'VERIFICATION_ONLY',
  period VARCHAR(32) NOT NULL,
  note VARCHAR(500) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'VALID',
  captured_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_checkin_rental_captured (rental_id, captured_at),
  INDEX idx_checkin_user_created (user_openid, created_at),
  INDEX idx_checkin_status (status)
);

CREATE TABLE IF NOT EXISTS rental_proof_verifications (
  proof_id VARCHAR(36) PRIMARY KEY,
  verification_status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
  verified_by VARCHAR(64),
  verified_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_proof_verification_status (verification_status, updated_at)
);

CREATE TABLE IF NOT EXISTS rental_public_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  owner_openid VARCHAR(64) NOT NULL,
  snapshot_date DATE NOT NULL,
  source VARCHAR(32) NOT NULL,
  title VARCHAR(120),
  content_preview VARCHAR(500),
  cover_photo_url VARCHAR(512),
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_rental_snapshot_date (rental_id, snapshot_date),
  INDEX idx_snapshot_rental_date (rental_id, snapshot_date DESC),
  INDEX idx_snapshot_updated (updated_at DESC)
);

CREATE TABLE IF NOT EXISTS rental_public_snapshot_spaces (
  id VARCHAR(36) PRIMARY KEY,
  snapshot_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  prompt_version VARCHAR(32) NOT NULL,
  scene_answers JSON,
  observations JSON,
  event_text TEXT,
  event_voice_url VARCHAR(512),
  event_occurred_period VARCHAR(32),
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_snapshot_space_module (snapshot_id, module_type)
);

CREATE TABLE IF NOT EXISTS rental_public_snapshot_photos (
  id VARCHAR(36) PRIMARY KEY,
  snapshot_space_id VARCHAR(36) NOT NULL,
  photo_asset_id VARCHAR(36) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  sort_order INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_snapshot_space_photo (snapshot_space_id, photo_asset_id)
);

-- 每日房屋观察任务模板采用版本化联合主键，已发布版本只追加不覆盖。
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

-- 每日任务通过房屋、房主、自然日和槽位唯一约束防止并发重复分配。
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

-- 任务观察是不可变事实来源，任务唯一键和客户端幂等键共同阻止重复写入。
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

-- 字段级事实值只追加，用于重建任意时间点的房屋状态。
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

-- owner/public 双指针分别支撑房主当前模型与公开模型。
CREATE TABLE IF NOT EXISTS rental_space_fact_heads (
  rental_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  fact_key VARCHAR(96) NOT NULL,
  owner_fact_value_id VARCHAR(36) NOT NULL,
  public_fact_value_id VARCHAR(36),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (rental_id, module_type, fact_key)
);

-- 快照活动保留同一天的多个更新来源，并确保每日任务活动不会重复生成。
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
