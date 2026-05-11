import { Text, View } from '@tarojs/components';

import './index.scss';

interface EmptyStateProps {
  message?: string;
  onReset?: () => void;
}

export default function EmptyState({ message = '暂无符合条件的屋檐故事', onReset }: EmptyStateProps) {
  return (
    <View className="empty-state">
      <Text className="empty-state__message">{message}</Text>
      {onReset && (
        <View className="empty-state__btn" onClick={onReset}>
          <Text>重置筛选</Text>
        </View>
      )}
    </View>
  );
}
