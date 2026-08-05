import type { RentalSpaceRecord, SpacePrompt } from '@shared/contracts/rental-space';
import { Image, Text, View } from '@tarojs/components';

import './index.scss';

/** 发布前空间切片预览参数。 */
interface SpaceSlicePreviewProps {
  moduleLabel: string;
  prompts: SpacePrompt[];
  record: RentalSpaceRecord;
  busy: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

/** 预览公开照片、场景观察和具体经历；仅核验照片不会显示。 */
export function SpaceSlicePreview({ moduleLabel, prompts, record, busy, onBack, onConfirm }: SpaceSlicePreviewProps) {
  const promptMap = new Map(prompts.map((prompt) => [prompt.id, prompt]));
  const publicPhotos = record.photos.filter((photo) => photo.visibility === 'PUBLIC');

  return (
    <View className="space-slice-preview">
      <Text className="point-step__eyebrow">04 / 保存之前</Text>
      <Text className="point-step__title">{moduleLabel}空间切片</Text>
      <Text className="point-step__prompt">这是其他住友将看到的居住片段，仅核验照片不会展示。</Text>

      {publicPhotos.length > 0 ? (
        <Image src={publicPhotos[0].url} mode="aspectFill" className="space-slice-preview__cover" />
      ) : (
        <View className="space-slice-preview__private-cover">
          <Text>照片仅用于核验</Text>
        </View>
      )}

      <View className="space-slice-preview__observations">
        {record.sceneAnswers.map((answer) => {
          const prompt = promptMap.get(answer.promptId);
          const value = prompt?.options.find((item) => item.value === answer.value)?.label;
          if (!prompt || !value) return null;
          return (
            <View className="space-slice-preview__observation" key={answer.promptId}>
              <Text className="space-slice-preview__observation-key">{prompt.title}</Text>
              <Text className="space-slice-preview__observation-value">{value}</Text>
            </View>
          );
        })}
      </View>

      <View className="space-slice-preview__quote">
        <Text className="space-slice-preview__quote-label">住在这里时</Text>
        <Text className="space-slice-preview__quote-text">{record.eventText}</Text>
      </View>

      <View className="point-step__actions">
        <View className="point-step__secondary" onClick={onBack}><Text>返回修改</Text></View>
        <View className={`point-step__primary point-step__primary--inline ${busy ? 'point-step__primary--disabled' : ''}`} onClick={onConfirm}>
          <Text>{busy ? '正在点亮' : '保存并点亮空间'}</Text>
        </View>
      </View>
    </View>
  );
}
