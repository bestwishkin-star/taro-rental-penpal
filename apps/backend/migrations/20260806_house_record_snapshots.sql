USE taro_rental_penpal;

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
