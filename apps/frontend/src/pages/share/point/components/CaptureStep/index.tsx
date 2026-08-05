import type { EvidenceVisibility, SpaceRecordPhoto } from '@shared/contracts/rental-space';
import { Image, Text, View } from '@tarojs/components';

import './index.scss';

/** 图片安全审核状态对应的用户可读文案。 */
const SAFETY_LABELS = {
  UNCHECKED: '等待安全检查',
  PENDING: '安全检查中',
  PASSED: '安全检查通过',
  REVIEW: '需要复核',
  REJECTED: '不可公开',
  FAILED: '检查暂时失败'
} as const;

/** 现场照片步骤的状态和交互回调。 */
interface CaptureStepProps {
  capturePrompt: string;
  photos: SpaceRecordPhoto[];
  visibility: EvidenceVisibility;
  busy: boolean;
  onVisibilityChange: (value: EvidenceVisibility) => void;
  onCapture: () => void;
  onPhotoVisibilityChange: (photo: SpaceRecordPhoto, value: EvidenceVisibility) => void;
  onDelete: (photo: SpaceRecordPhoto) => void;
  onNext: () => void;
}

/** 展示随机拍摄要求、隐私选择以及已上传照片。 */
export function CaptureStep({
  capturePrompt,
  photos,
  visibility,
  busy,
  onVisibilityChange,
  onCapture,
  onPhotoVisibilityChange,
  onDelete,
  onNext
}: CaptureStepProps) {
  return (
    <View className="capture-step">
      <Text className="point-step__eyebrow">01 / 现场记录</Text>
      <Text className="point-step__title">拍下此刻</Text>
      <Text className="point-step__prompt">{capturePrompt}</Text>

      <View className="capture-step__privacy">
        <View
          className={`capture-step__privacy-option ${visibility === 'PUBLIC' ? 'capture-step__privacy-option--active' : ''}`}
          onClick={() => onVisibilityChange('PUBLIC')}
        >
          <Text className="capture-step__privacy-title">公开展示</Text>
          <Text className="capture-step__privacy-copy">出现在空间切片中</Text>
        </View>
        <View
          className={`capture-step__privacy-option ${visibility === 'VERIFICATION_ONLY' ? 'capture-step__privacy-option--active' : ''}`}
          onClick={() => onVisibilityChange('VERIFICATION_ONLY')}
        >
          <Text className="capture-step__privacy-title">仅作核验</Text>
          <Text className="capture-step__privacy-copy">其他住友不可见</Text>
        </View>
      </View>

      <View className={`capture-step__camera ${busy ? 'capture-step__camera--disabled' : ''}`} onClick={onCapture}>
        <Text className="capture-step__camera-title">{busy ? '正在保存照片' : '打开相机拍摄'}</Text>
        <Text className="capture-step__camera-copy">仅支持现场拍摄，单张不超过 10MB</Text>
      </View>

      {photos.map((photo) => (
        <View className="capture-step__photo" key={photo.id}>
          <Image src={photo.url} mode="aspectFill" className="capture-step__photo-image" />
          <View className="capture-step__photo-body">
            <Text className="capture-step__photo-status">{SAFETY_LABELS[photo.safetyStatus]}</Text>
            <View className="capture-step__photo-actions">
              <Text
                className="capture-step__photo-action"
                onClick={() =>
                  onPhotoVisibilityChange(
                    photo,
                    photo.visibility === 'PUBLIC' ? 'VERIFICATION_ONLY' : 'PUBLIC'
                  )
                }
              >
                {photo.visibility === 'PUBLIC' ? '改为仅核验' : '改为公开'}
              </Text>
              <Text className="capture-step__photo-action capture-step__photo-action--danger" onClick={() => onDelete(photo)}>
                删除
              </Text>
            </View>
          </View>
        </View>
      ))}

      <View className={`point-step__primary ${photos.length === 0 ? 'point-step__primary--disabled' : ''}`} onClick={onNext}>
        <Text>继续还原日常</Text>
      </View>
    </View>
  );
}
