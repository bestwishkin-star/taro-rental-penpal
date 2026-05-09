import { code2Session, findOrCreateUser } from './auth.repository';

import type { LoginResponse } from '@shared/contracts/auth';

import { signToken } from '@/lib/jwt';

/** 完成微信 code 登录，生成 JWT 并返回前端需要的用户信息。 */
export async function loginWithCode(code: string): Promise<LoginResponse> {
  const session = await code2Session(code);
  const user = await findOrCreateUser(session.openid);
  const token = await signToken({ openid: user.openid });

  return {
    token,
    user: {
      avatarUrl: user.avatarUrl,
      id: user.openid,
      nickname: user.nickname
    }
  };
}
