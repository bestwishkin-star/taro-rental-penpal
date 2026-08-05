USE taro_rental_penpal;

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
  draft_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  prompt VARCHAR(500) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_capture_challenge_owner (user_openid, draft_id, module_type, expires_at),
  INDEX idx_capture_challenge_expiry (expires_at, used_at)
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
