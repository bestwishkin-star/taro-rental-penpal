import { Text, View } from '@tarojs/components';

import type { HouseModule } from '@/shared/ui/house-explorer';

import './index.scss';

/** 编辑态点位提示气泡属性。 */
interface PointPromptBubbleProps {
  module: HouseModule;
  onClose: () => void;
  onSupplement: () => void;
}

/** 根据点位完成状态引导用户补充或更新空间记录。 */
export function PointPromptBubble({ module, onClose, onSupplement }: PointPromptBubbleProps) {
  const actionLabel = module.completed ? '更新' : '补充';

  return (
    <View className="point-prompt-bubble">
      <View className="point-prompt-bubble__header">
        <View className="point-prompt-bubble__heading">
          <Text className="point-prompt-bubble__eyebrow">{actionLabel}点位</Text>
          <Text className="point-prompt-bubble__title">{module.label}</Text>
        </View>
        <View className="point-prompt-bubble__close" onClick={onClose}>
          <Text className="point-prompt-bubble__close-icon">x</Text>
        </View>
      </View>
      <Text className="point-prompt-bubble__copy">{module.prompt}</Text>
      <View className="point-prompt-bubble__action" onClick={onSupplement}>
        <Text className="point-prompt-bubble__action-text">去{actionLabel}</Text>
      </View>
    </View>
  );
}
