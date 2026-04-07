import { httpRequest, uploadFile } from './http';

import type { LoginRequest, LoginResponse } from '@shared/contracts/auth';
import type { ConversationPreview } from '@shared/contracts/chat';
import type { OverviewPayload } from '@shared/contracts/overview';
import type {
  CreateRentalInput,
  CreateRentalResponse,
  ListRentalsQuery,
  RentalListing
} from '@shared/contracts/rental';
import type { UserProfile, UserProfileInput } from '@shared/contracts/user';

import { frontendEnv } from '@/shared/config/env';

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

export function fetchRentals(query?: ListRentalsQuery) {
  const params: Record<string, string> = {};
  if (query?.keyword) params.keyword = query.keyword;
  if (query?.filter) params.filter = query.filter;
  if (query?.sort) params.sort = query.sort;
  if (query?.page) params.page = query.page;
  if (query?.pageSize) params.pageSize = query.pageSize;
  return httpRequest<RentalListing[]>('/rentals', Object.keys(params).length ? { params } : {});
}

export function fetchConversations() {
  return httpRequest<ConversationPreview[]>('/chat/conversations');
}

export async function uploadPhoto(filePath: string): Promise<{ url: string }> {
  const result = await uploadFile<{ url: string }>('/upload', filePath);
  // 后端返回相对路径 /uploads/xxx，需要拼成完整 URL 供小程序加载
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  return { url: `${serverBase}${result.url}` };
}

export function createRental(input: CreateRentalInput) {
  return httpRequest<CreateRentalResponse, CreateRentalInput>('/rentals', {
    method: 'POST',
    body: input
  });
}
