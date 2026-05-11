import type { RentalRegionInput } from '@shared/contracts/location';
import type { RentalStayStage } from '@shared/contracts/rental';

export interface ShareExperienceDraft {
  experience: string;
  photos: string[];
  truthPledge: boolean;
}

export interface RentalSupplementDraft {
  price: string;
  region: RentalRegionInput | null;
  landmark: string;
  roomTypeIndex: number;
  stayStage?: RentalStayStage;
}

/** 校验首次分享表单，补充参考信息不在首次分享时强制填写。 */
export function validateShareExperienceDraft(draft: ShareExperienceDraft): string | null {
  if (!draft.experience.trim()) return '请填写真实经历';
  if (draft.photos.length === 0) return '请至少上传 1 张图片';
  if (!draft.truthPledge) return '请确认内容来自真实经历';
  return null;
}

/** 校验后续补充参考信息的表单。 */
export function validateRentalSupplementDraft(draft: RentalSupplementDraft): string | null {
  if (!draft.price.trim()) return '请填写费用参考';
  if (!draft.region) return '请选择城市和区域';
  if (!draft.landmark.trim()) return '请填写地点或地标';
  if (draft.roomTypeIndex < 0) return '请选择空间类型';
  if (!draft.stayStage) return '请选择经历阶段';
  return null;
}
