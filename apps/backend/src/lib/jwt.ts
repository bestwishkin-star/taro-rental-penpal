import { SignJWT, jwtVerify } from 'jose';

import { env } from './env';

// JWT 签名算法，需与 jose SignJWT/verifyToken 保持一致。
const ALG = 'HS256';
// 登录态有效期，前端 token 过期后需要重新登录。
const EXPIRES_IN = '30d';

/** 将环境变量中的 JWT 密钥转换为 jose 可用的字节数组。 */
function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

/** JWT 载荷：openid 是后端识别登录用户的核心字段。 */
export interface JwtPayload {
  openid: string;
  [key: string]: unknown;
}

/** 签发登录 token。 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

/** 验证登录 token，失败时返回 null 供接口层判定未登录。 */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { openid: payload['openid'] as string };
  } catch {
    return null;
  }
}
