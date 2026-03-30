import { code2Session, findOrCreateUser } from './auth.repository';

import type { LoginResponse } from '@shared/contracts/auth';

export async function loginWithCode(code: string): Promise<LoginResponse> {
  const session = await code2Session(code);
  const user = await findOrCreateUser(session.openid);

  return {
    token: user.token,
    user: {
      avatarUrl: user.avatarUrl,
      id: user.openid,
      nickname: user.nickname
    }
  };
}
