import type { LoginRequest, LoginResponse } from '@shared/contracts/auth';
import type { ConversationPreview } from '@shared/contracts/chat';
import type { OverviewPayload } from '@shared/contracts/overview';
import type {
  CreateRentalCommentInput,
  CreateRentalInput,
  CreateRentalReportInput,
  CreateRentalResponse,
  FavoriteStatus,
  ListRentalsQuery,
  RentalComment,
  RentalDetail,
  RentalListing,
  RentalStatus,
  UpdateRentalStatusInput,
  UpdateRentalSupplementInput
} from '@shared/contracts/rental';
import type { UserProfile, UserProfileInput } from '@shared/contracts/user';
import Taro from '@tarojs/taro';

import { frontendEnv } from '@/shared/config/env';

import { httpRequest, uploadFile } from './http';

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
    method: 'PUT',
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
  if (query?.priceRange) params.priceRange = query.priceRange;
  if (query?.province) params.province = query.province;
  if (query?.city) params.city = query.city;
  if (query?.district) params.district = query.district;
  return httpRequest<RentalListing[]>('/rentals', Object.keys(params).length ? { params } : {});
}

export function updateRentalStatus(id: string, status: RentalStatus) {
  return httpRequest<null, UpdateRentalStatusInput>(`/rentals/${id}/status`, {
    method: 'PATCH',
    body: { status }
  });
}

export function updateRentalSupplement(id: string, input: UpdateRentalSupplementInput) {
  return httpRequest<null, UpdateRentalSupplementInput>(`/rentals/${id}`, {
    method: 'PATCH',
    body: input
  });
}

export function fetchConversations() {
  return httpRequest<ConversationPreview[]>('/chat/conversations');
}

export async function uploadPhoto(filePath: string): Promise<{ url: string }> {
  const result = await uploadFile<{ url: string }>('/upload', filePath);
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  return { url: `${serverBase}${result.url}` };
}

export function fetchRental(id: string) {
  return httpRequest<RentalDetail>(`/rentals/${id}`);
}

export function createRental(input: CreateRentalInput) {
  return httpRequest<CreateRentalResponse, CreateRentalInput>('/rentals', {
    method: 'POST',
    body: input
  });
}

export function fetchMyRentals() {
  return httpRequest<RentalListing[]>('/rentals/mine');
}

export function fetchFavorites() {
  return httpRequest<RentalListing[]>('/user/favorites');
}

export function fetchFavoriteStatus(id: string) {
  return httpRequest<FavoriteStatus>(`/rentals/${id}/favorite`);
}

export function toggleFavorite(id: string) {
  return httpRequest<FavoriteStatus>(`/rentals/${id}/favorite`, { method: 'POST' });
}

export function fetchRentalComments(id: string) {
  return httpRequest<RentalComment[]>(`/rentals/${id}/comments`);
}

export function createRentalComment(id: string, content: string) {
  return httpRequest<RentalComment, CreateRentalCommentInput>(`/rentals/${id}/comments`, {
    method: 'POST',
    body: { content }
  });
}

export function deleteRentalComment(id: string) {
  return httpRequest<null>(`/rental-comments/${id}`, { method: 'DELETE' });
}

export function createRentalReport(id: string, input: CreateRentalReportInput) {
  return httpRequest<{ id: string }, CreateRentalReportInput>(`/rentals/${id}/reports`, {
    method: 'POST',
    body: input
  });
}

const BROWSE_HISTORY_KEY = 'browse_history';
const MAX_HISTORY = 30;

export function saveToBrowseHistory(rental: RentalListing): void {
  const existing: RentalListing[] = Taro.getStorageSync(BROWSE_HISTORY_KEY) || [];
  const filtered = existing.filter((r) => r.id !== rental.id);
  Taro.setStorageSync(BROWSE_HISTORY_KEY, [rental, ...filtered].slice(0, MAX_HISTORY));
}

export function getBrowseHistory(): RentalListing[] {
  return Taro.getStorageSync(BROWSE_HISTORY_KEY) || [];
}
