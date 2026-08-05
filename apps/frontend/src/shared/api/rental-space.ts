import type { ApiResponse } from '@shared/contracts/api';
import type {
  AttachSpacePhotoInput,
  CreateRentalCheckinInput,
  HouseModuleId,
  PhotoAnalysisSummary,
  PhotoCaptureChallenge,
  PhotoAssetUploadResponse,
  PublishedRentalSpaceResponse,
  PublishRentalDraftResponse,
  RentalDraftSummary,
  RentalCheckinSummary,
  SpaceRecordResponse,
  UpdateSpacePhotoInput,
  UpsertSpaceRecordInput
} from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';
import Taro from '@tarojs/taro';

import { frontendEnv } from '@/shared/config/env';

import { BizError, getToken, httpRequest } from './http';

/** 幂等创建或获取当前用户的未发布空间草稿。 */
export function ensureRentalDraft() {
  return httpRequest<RentalDraftSummary>('/rental-drafts', { method: 'POST' });
}

/** 只读查询当前草稿，不存在时返回 null。 */
export function fetchCurrentRentalDraft() {
  return httpRequest<RentalDraftSummary | null>('/rental-drafts/current');
}

/** 获取指定草稿点位的题目配置和已保存内容。 */
export function fetchSpaceRecord(draftId: string, module: HouseModuleId) {
  return httpRequest<SpaceRecordResponse>(`/rental-drafts/${draftId}/space-records/${module}`);
}

/** 部分保存点位内容，未提供字段由服务端保持原值。 */
export function saveSpaceRecord(draftId: string, module: HouseModuleId, input: UpsertSpaceRecordInput) {
  return httpRequest<SpaceRecordResponse, UpsertSpaceRecordInput>(
    `/rental-drafts/${draftId}/space-records/${module}`,
    { method: 'PATCH', body: input }
  );
}

/**
 * 使用小程序上传能力创建统一图片资产。
 * source 固定为 CAMERA，便于后端区分现场拍摄与相册图片。
 */
export async function uploadPhotoAsset(filePath: string): Promise<PhotoAssetUploadResponse> {
  const header: Record<string, string> = {};
  const token = getToken();
  if (token) header.authorization = `Bearer ${token}`;

  const response = await Taro.uploadFile({
    url: `${frontendEnv.apiBaseUrl}/photo-assets`,
    filePath,
    name: 'file',
    header,
    formData: { source: 'CAMERA' }
  });
  if (response.statusCode >= 400) {
    throw new BizError(BizCode.UNKNOWN, `图片上传失败 [${response.statusCode}]`);
  }
  const result = JSON.parse(response.data) as ApiResponse<PhotoAssetUploadResponse>;
  if (result.code !== BizCode.OK) throw new BizError(result.code, result.message);
  return result.data as PhotoAssetUploadResponse;
}

/** 将图片资产连同一次性拍摄挑战绑定到空间点位。 */
export function attachSpacePhoto(draftId: string, module: HouseModuleId, input: AttachSpacePhotoInput) {
  return httpRequest<SpaceRecordResponse, AttachSpacePhotoInput>(
    `/rental-drafts/${draftId}/space-records/${module}/photos`,
    { method: 'POST', body: input }
  );
}

/** 为点位申请一个短时有效的随机拍摄提示。 */
export function createCaptureChallenge(draftId: string, module: HouseModuleId) {
  return httpRequest<PhotoCaptureChallenge>(
    `/rental-drafts/${draftId}/space-records/${module}/capture-challenge`,
    { method: 'POST' }
  );
}

/** 修改草稿照片的公开范围。 */
export function updateSpacePhoto(
  draftId: string,
  module: HouseModuleId,
  photoId: string,
  input: UpdateSpacePhotoInput
) {
  return httpRequest<SpaceRecordResponse, UpdateSpacePhotoInput>(
    `/rental-drafts/${draftId}/space-records/${module}/photos/${photoId}`,
    { method: 'PATCH', body: input }
  );
}

/** 删除点位中的照片绑定。 */
export function deleteSpacePhoto(draftId: string, module: HouseModuleId, photoId: string) {
  return httpRequest<SpaceRecordResponse>(
    `/rental-drafts/${draftId}/space-records/${module}/photos/${photoId}`,
    { method: 'DELETE' }
  );
}

/** 查询本人图片的安全与家庭一致性分析状态。 */
export function fetchPhotoAnalysis(assetId: string) {
  return httpRequest<PhotoAnalysisSummary>(`/photo-assets/${assetId}/analysis`);
}

/** 发布六点均已完成的空间草稿。 */
export function publishRentalDraft(draftId: string) {
  return httpRequest<PublishRentalDraftResponse>(`/rental-drafts/${draftId}/publish`, { method: 'POST' });
}

/** 获取公开故事的六处空间切片和可信依据。 */
export function fetchPublishedRentalSpaces(rentalId: string) {
  return httpRequest<PublishedRentalSpaceResponse>(`/rentals/${rentalId}/space-records`);
}

/** 为本人故事新增一次跨时间居住微打卡。 */
export function createRentalCheckin(rentalId: string, input: CreateRentalCheckinInput) {
  return httpRequest<{ id: string }, CreateRentalCheckinInput>(`/rentals/${rentalId}/checkins`, {
    method: 'POST',
    body: input
  });
}

/** 获取不包含私密照片的连续居住汇总。 */
export function fetchRentalCheckinSummary(rentalId: string) {
  return httpRequest<RentalCheckinSummary>(`/rentals/${rentalId}/checkins/summary`);
}
