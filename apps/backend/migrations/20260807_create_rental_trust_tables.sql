USE taro_rental_penpal;

-- 为旧数据库补齐房屋可信依据相关表，可重复执行。
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
