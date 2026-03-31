import { httpRequest, uploadFile } from './http';

import type { LoginRequest, LoginResponse } from '@shared/contracts/auth';
import type { ConversationPreview } from '@shared/contracts/chat';
import type { OverviewPayload } from '@shared/contracts/overview';
import type { CreateRentalInput, CreateRentalResponse, RentalListing } from '@shared/contracts/rental';
import type { UserProfile, UserProfileInput } from '@shared/contracts/user';

export function login(code: string) {
  return httpRequest<LoginResponse, LoginRequest>('/auth/login', {
    method: 'POST',
    body: { code }
  });
}

export function fetchOverview() {
  return httpRequest<OverviewPayload>('/overview');
}

export function fetchUserProfile() {
  return httpRequest<UserProfile>('/user/profile');
}

export function saveUserProfile(input: UserProfileInput) {
  return httpRequest<UserProfile, UserProfileInput>('/user/profile', {
    method: 'POST',
    body: input
  });
}

export function fetchRentals() {
  return httpRequest<RentalListing[]>('/rentals');
}

export function fetchConversations() {
  return httpRequest<ConversationPreview[]>('/chat/conversations');
}

export function uploadPhoto(filePath: string) {
  return uploadFile<{ url: string }>('/upload', filePath);
}

export function createRental(input: CreateRentalInput) {
  return httpRequest<CreateRentalResponse, CreateRentalInput>('/rentals', {
    method: 'POST',
    body: input
  });
}
