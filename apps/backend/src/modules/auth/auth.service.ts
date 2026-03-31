import { code2Session, findOrCreateUser } from './auth.repository';

import type { LoginResponse } from '@shared/contracts/auth';

import { signToken } from '@/lib/jwt';

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
