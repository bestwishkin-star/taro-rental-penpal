import type { UserProfileInput } from '@shared/contracts/user';

import { getUserProfile, saveUserProfile } from './user.repository';

export async function readUserProfile() {
  return getUserProfile();
}

export async function updateUserProfile(input: UserProfileInput) {
  return saveUserProfile(input);
}
