import { SignJWT, jwtVerify } from 'jose';

import { env } from './env';

const ALG = 'HS256';
const EXPIRES_IN = '30d';

function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export interface JwtPayload {
  openid: string;
  [key: string]: unknown;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { openid: payload['openid'] as string };
  } catch {
    return null;
  }
}
