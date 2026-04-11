import type { UserProfileInput } from '@shared/contracts/user';

import { getUserProfile, saveUserProfile } from './user.repository';

export async function readUserProfile(openid: string) {
  return getUserProfile(openid);
}

export async function updateUserProfile(openid: string, input: UserProfileInput) {
  return saveUserProfile(openid, input);
}
