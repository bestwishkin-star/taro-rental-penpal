-- 迁移脚本：将旧版 rentals 表升级为新结构
-- 如果是全新数据库，直接执行 schema.sql 即可，无需运行此文件

USE taro_rental_penpal;

-- 重建 rentals 表（旧表无重要数据，直接替换）
DROP TABLE IF EXISTS rentals;

CREATE TABLE rentals (
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
