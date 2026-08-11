USE taro_rental_penpal;

-- 为旧数据库补齐屋檐故事公开评论表，可重复执行。
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
