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
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(256) NOT NULL,
  district VARCHAR(64) NOT NULL,
  price VARCHAR(64) NOT NULL,
  meta VARCHAR(256) NOT NULL,
  tags JSON,
  created_at DATETIME NOT NULL DEFAULT NOW()
);
