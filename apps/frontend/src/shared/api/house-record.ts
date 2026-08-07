import type {
  HouseRecordListing,
  HouseRecordSnapshotResponse,
  HouseRecordSnapshotStatus,
  HouseRecordTimelineResponse
} from '@shared/contracts/house-record';

import { httpRequest } from './http';

/** 房屋实录发现列表查询参数。 */
export interface HouseRecordListQuery {
  keyword?: string;
  page?: number;
  pageSize?: number;
}

/** 读取公开房屋实录发现列表。 */
export function fetchHouseRecords(query?: HouseRecordListQuery) {
  const params: Record<string, string | undefined> = {
    keyword: query?.keyword,
    page: query?.page ? String(query.page) : undefined,
    pageSize: query?.pageSize ? String(query.pageSize) : undefined
  };
  return httpRequest<HouseRecordListing[]>('/house-records', { params });
}

/** 读取指定房屋最近 30 天成长节点。 */
export function fetchHouseRecordTimeline(rentalId: string) {
  return httpRequest<HouseRecordTimelineResponse>(`/house-records/${rentalId}/timeline`, {
    params: { days: '30' }
  });
}

/** 读取指定自然日固化的公开房屋快照。 */
export function fetchHouseRecordSnapshot(rentalId: string, snapshotDate: string) {
  return httpRequest<HouseRecordSnapshotResponse>(
    `/house-records/${rentalId}/snapshots/${snapshotDate}`
  );
}

/** 读取房主当前态相对最后公开快照的更新状态。 */
export function fetchHouseRecordSnapshotStatus(rentalId: string) {
  return httpRequest<HouseRecordSnapshotStatus>(`/rentals/${rentalId}/snapshot-status`);
}

/** 将房主当前六空间状态更新到当天公开实录。 */
export function publishHouseRecordSnapshot(rentalId: string) {
  return httpRequest<{ snapshotDate: string }>(`/rentals/${rentalId}/snapshots`, {
    method: 'POST'
  });
}
