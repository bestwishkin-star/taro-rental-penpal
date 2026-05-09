import type { UserProfileInput } from '@shared/contracts/user';

import { getUserProfile, saveUserProfile } from './user.repository';

/** 读取当前登录用户资料。 */
export async function readUserProfile(openid: string) {
  return getUserProfile(openid);
}

/** 更新当前登录用户资料。 */
export async function updateUserProfile(openid: string, input: UserProfileInput) {
  return saveUserProfile(openid, input);
}
