import { Text, View } from '@tarojs/components';
import React from 'react';

import './index.scss';

interface EmptyStateProps {
  message?: string;
  onReset?: () => void;
}

export default function EmptyState({ message = '暂无符合条件的房源', onReset }: EmptyStateProps) {
  return (
    <View className="empty-state">
      <Text className="empty-state__message">{message}</Text>
      {onReset && (
        <View className="empty-state__btn" onClick={onReset}>
          <Text>清空筛选</Text>
        </View>
      )}
    </View>
  );
}
