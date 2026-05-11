import { BizCode } from '@shared/errors';
import type { RowDataPacket } from 'mysql2/promise';

import { env } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { pool } from '@/lib/mysql';

/** 微信 jscode2session 接口返回结构。 */
interface WechatSessionResponse {
  errcode?: number;
  errmsg?: string;
  openid: string;
  session_key: string;
}

/** users 表登录流程需要的基础字段。 */
interface UserRow extends RowDataPacket {
  openid: string;
  nickname: string;
  avatar_url: string;
}

/** 使用微信登录 code 换取 openid 和 session_key。 */
export async function code2Session(code: string): Promise<WechatSessionResponse> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${env.WECHAT_APP_ID}&secret=${env.WECHAT_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const response = await fetch(url);
  const data = (await response.json()) as WechatSessionResponse;

  if (data.errcode) {
    throw new AppError(BizCode.WECHAT_LOGIN_FAILED, `微信登录失败: ${data.errmsg}`);
  }

  return data;
}

/** 根据 openid 查找用户；首次登录时创建默认用户资料。 */
export async function findOrCreateUser(openid: string) {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT openid, nickname, avatar_url FROM users WHERE openid = ?',
    [openid]
  );

  if (rows.length > 0) {
    await pool.execute('UPDATE users SET updated_at = NOW() WHERE openid = ?', [openid]);
    return {
      openid: rows[0].openid,
      nickname: rows[0].nickname,
      avatarUrl: rows[0].avatar_url
    };
  }

  await pool.execute(
    'INSERT INTO users (openid, nickname, avatar_url, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
    [openid, '租房用户', '']
  );

  return { openid, nickname: '租房用户', avatarUrl: '' };
}

/** 按 openid 查询用户基础资料，未找到时返回 null。 */
export async function findUserByOpenid(openid: string) {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT openid, nickname, avatar_url FROM users WHERE openid = ?',
    [openid]
  );

  if (!rows[0]) return null;
  return {
    openid: rows[0].openid,
    nickname: rows[0].nickname,
    avatarUrl: rows[0].avatar_url
  };
}
