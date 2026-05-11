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
