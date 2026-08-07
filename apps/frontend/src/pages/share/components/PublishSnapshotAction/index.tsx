import { Text, View } from '@tarojs/components';

import './index.scss';

/** 房屋实录主动更新操作属性。 */
interface PublishSnapshotActionProps {
  hasUnpublishedChanges: boolean;
  completion: number;
  busy: boolean;
  onPublish: () => void;
}

/** 仅在已发布房屋存在新修改时展示更新入口。 */
export function PublishSnapshotAction({
  hasUnpublishedChanges,
  completion,
  busy,
  onPublish
}: PublishSnapshotActionProps) {
  if (!hasUnpublishedChanges) return null;

  const complete = completion === 100;
  const disabled = busy || !complete;

  return (
    <View className="publish-snapshot">
      <View className="publish-snapshot__copy">
        <Text className="publish-snapshot__title">房屋有了新的生活变化</Text>
        <Text className="publish-snapshot__hint">
          {complete ? '更新后会覆盖今天的实录，不会改动过去的日期' : '完成六个空间后即可更新实录'}
        </Text>
      </View>
      <View
        className={`publish-snapshot__action${
          disabled ? ' publish-snapshot__action--disabled' : ''
        }`}
        hoverClass={disabled ? undefined : 'publish-snapshot__action--pressed'}
        onClick={disabled ? undefined : onPublish}
      >
        <Text className="publish-snapshot__action-text">
          {busy ? '正在更新' : '更新房屋实录'}
        </Text>
      </View>
    </View>
  );
}
