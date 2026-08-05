import type { CreateRentalCheckinInput } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { AppError } from '@/lib/errors';
import { getOwnedPhotoAsset } from '@/modules/photo-analysis/photo-asset.repository';

import {
  createRentalCheckin,
  getRentalCheckinSummary,
  isRentalOwner
} from './rental-checkin.repository';

/** 校验故事所有权、照片所有权和拍摄时间后保存微打卡。 */
export async function publishRentalCheckin(
  rentalId: string,
  userOpenid: string,
  input: CreateRentalCheckinInput
) {
  if (!(await isRentalOwner(rentalId, userOpenid))) {
    throw new AppError(BizCode.FORBIDDEN, '只能为自己的屋檐记补充居住记录');
  }
  const asset = await getOwnedPhotoAsset(input.assetId, userOpenid);
  if (!asset) throw new AppError(BizCode.NOT_FOUND, '打卡照片不存在');
  if (asset.safety_status === 'REJECTED' || asset.safety_status === 'REVIEW') {
    throw new AppError(BizCode.INVALID_PARAMS, '该照片暂时不能用于居住记录');
  }
  const capturedAt = new Date(input.capturedAt);
  if (Number.isNaN(capturedAt.getTime()) || capturedAt.getTime() > Date.now() + 5 * 60 * 1000) {
    throw new AppError(BizCode.INVALID_PARAMS, '拍摄时间不正确');
  }
  return createRentalCheckin(rentalId, userOpenid, {
    ...input,
    note: input.note.trim(),
    capturedAt
  });
}

/** 返回不含私密照片 URL 的公开打卡汇总。 */
export async function readRentalCheckinSummary(rentalId: string) {
  return getRentalCheckinSummary(rentalId);
}
