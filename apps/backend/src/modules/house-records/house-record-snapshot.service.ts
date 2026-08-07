import { BizCode } from '@shared/errors';

import { AppError } from '@/lib/errors';

import { getShanghaiDate } from './house-record-date';
import { getOwnedSnapshotDraft, replaceSnapshotFromDraft } from './house-record-snapshot.repository';

/** 校验房主权限后，将当前六空间状态发布为当天公开快照。 */
export async function publishCurrentHouseRecord(
  userOpenid: string,
  rentalId: string,
  now = new Date()
): Promise<{ snapshotDate: string }> {
  const draft = await getOwnedSnapshotDraft(userOpenid, rentalId);
  if (!draft) throw new AppError(BizCode.RENTAL_PERMISSION_DENIED, '无权更新该房屋实录');

  const snapshotDate = getShanghaiDate(now);
  const result = await replaceSnapshotFromDraft({
    draftId: draft.draftId,
    rentalId,
    ownerOpenid: userOpenid,
    snapshotDate,
    source: 'MANUAL_UPDATE'
  });
  if (result.status === 'INCOMPLETE') {
    throw new AppError(BizCode.INVALID_PARAMS, '请先完成六个空间记录');
  }
  return { snapshotDate };
}
