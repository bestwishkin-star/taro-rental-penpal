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


-- 仅为六空间完整且仍公开的历史房屋初始化首日系统快照。
INSERT IGNORE INTO rental_public_snapshots (
  id,
  rental_id,
  owner_openid,
  snapshot_date,
  source,
  title,
  content_preview,
  cover_photo_url,
  created_at,
  updated_at
)
SELECT
  UUID(),
  draft.published_rental_id,
  draft.user_openid,
  DATE(COALESCE(draft.published_at, draft.updated_at)),
  'SYSTEM',
  '一方屋檐下的生活实录',
  LEFT(rental.experience, 500),
  (
    SELECT asset.file_url
    FROM rental_space_records cover_record
    INNER JOIN rental_space_photos cover_photo ON cover_photo.space_record_id = cover_record.id
    INNER JOIN photo_assets asset ON asset.id = cover_photo.photo_asset_id
    WHERE cover_record.draft_id = draft.id
      AND cover_photo.visibility = 'PUBLIC'
      AND asset.safety_status NOT IN ('REJECTED', 'REVIEW')
    ORDER BY cover_photo.created_at ASC
    LIMIT 1
  ),
  COALESCE(draft.published_at, draft.updated_at),
  COALESCE(draft.published_at, draft.updated_at)
FROM rental_story_drafts draft
INNER JOIN rentals rental ON rental.id = draft.published_rental_id
WHERE draft.status = 'PUBLISHED'
  AND draft.published_rental_id IS NOT NULL
  AND rental.status = 1
  AND COALESCE(rental.post_status, 'active') = 'active'
  AND (
    SELECT COUNT(DISTINCT complete_record.module_type)
    FROM rental_space_records complete_record
    WHERE complete_record.draft_id = draft.id
      AND complete_record.completed_at IS NOT NULL
  ) = 6;

-- 将历史草稿的六空间正文固化到刚初始化的系统快照。
INSERT IGNORE INTO rental_public_snapshot_spaces (
  id,
  snapshot_id,
  module_type,
  prompt_version,
  scene_answers,
  observations,
  event_text,
  event_voice_url,
  event_occurred_period,
  created_at
)
SELECT
  UUID(),
  snapshot.id,
  record.module_type,
  record.prompt_version,
  record.scene_answers,
  JSON_ARRAY(),
  record.event_text,
  record.event_voice_url,
  record.event_occurred_period,
  snapshot.created_at
FROM rental_public_snapshots snapshot
INNER JOIN rental_story_drafts draft
  ON draft.published_rental_id = snapshot.rental_id AND draft.status = 'PUBLISHED'
INNER JOIN rental_space_records record
  ON record.draft_id = draft.id AND record.completed_at IS NOT NULL
WHERE snapshot.source = 'SYSTEM';

-- 只复制社区公开且未进入拒绝或复审状态的历史照片。
INSERT IGNORE INTO rental_public_snapshot_photos (
  id,
  snapshot_space_id,
  photo_asset_id,
  file_url,
  sort_order,
  created_at
)
SELECT
  UUID(),
  snapshot_space.id,
  photo.photo_asset_id,
  asset.file_url,
  ROW_NUMBER() OVER (
    PARTITION BY snapshot_space.id
    ORDER BY photo.created_at ASC
  ) - 1,
  snapshot.created_at
FROM rental_public_snapshots snapshot
INNER JOIN rental_story_drafts draft
  ON draft.published_rental_id = snapshot.rental_id AND draft.status = 'PUBLISHED'
INNER JOIN rental_space_records record ON record.draft_id = draft.id
INNER JOIN rental_public_snapshot_spaces snapshot_space
  ON snapshot_space.snapshot_id = snapshot.id
  AND snapshot_space.module_type = record.module_type
INNER JOIN rental_space_photos photo ON photo.space_record_id = record.id
INNER JOIN photo_assets asset ON asset.id = photo.photo_asset_id
WHERE snapshot.source = 'SYSTEM'
  AND photo.visibility = 'PUBLIC'
  AND asset.safety_status NOT IN ('REJECTED', 'REVIEW');
