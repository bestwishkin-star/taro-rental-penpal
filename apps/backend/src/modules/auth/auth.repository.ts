import crypto from 'node:crypto';

import { BizCode } from '@shared/errors';

import type { RowDataPacket } from 'mysql2/promise';

import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { pool } from '@/lib/mysql';

interface WechatSessionResponse {
  errcode?: number;
  errmsg?: string;
  openid: string;
  session_key: string;
}

interface UserRow extends RowDataPacket {
  openid: string;
  nickname: string;
  avatar_url: string;
  token: string;
}

export async function code2Session(code: string): Promise<WechatSessionResponse> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${env.WECHAT_APP_ID}&secret=${env.WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const response = await fetch(url);
  const data = (await response.json()) as WechatSessionResponse;

  if (data.errcode) {
    throw new AppError(BizCode.WECHAT_LOGIN_FAILED, `微信登录失败: ${data.errmsg}`);
  }

  return data;
}

export async function findOrCreateUser(openid: string) {
  const token = crypto.randomUUID();
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT openid, nickname, avatar_url, token FROM users WHERE openid = ?',
    [openid]
  );

  if (rows.length > 0) {
    await pool.execute('UPDATE users SET token = ?, updated_at = NOW() WHERE openid = ?', [
      token,
      openid
    ]);
    return {
      openid: rows[0].openid,
      nickname: rows[0].nickname,
      avatarUrl: rows[0].avatar_url,
      token
    };
  }

  await pool.execute(
    'INSERT INTO users (openid, nickname, avatar_url, token, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
    [openid, '租房用户', '', token]
  );

  return { openid, nickname: '租房用户', avatarUrl: '', token };
}

export async function findUserByToken(token: string) {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT openid, nickname, avatar_url, token FROM users WHERE token = ?',
    [token]
  );

  if (!rows[0]) return null;
  return {
    openid: rows[0].openid,
    nickname: rows[0].nickname,
    avatarUrl: rows[0].avatar_url,
    token: rows[0].token
  };
}
