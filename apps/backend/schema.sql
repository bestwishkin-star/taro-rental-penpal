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
  price VARCHAR(50) NOT NULL,
  location VARCHAR(255) NOT NULL,
  room_type VARCHAR(20) NOT NULL,
  area VARCHAR(50) NOT NULL DEFAULT '',
  experience TEXT NOT NULL,
  tags JSON,
  wechat VARCHAR(100) NOT NULL DEFAULT '',
  photos JSON,
  status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_user_openid (user_openid),
  INDEX idx_status_created (status, created_at)
);

CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_openid VARCHAR(64) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_user_rental (user_openid, rental_id),
  INDEX idx_user_openid (user_openid)
);
