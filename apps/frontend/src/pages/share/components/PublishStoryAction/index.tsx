import { Text, View } from '@tarojs/components';

import './index.scss';

/** 三维房屋全部点亮后显示的发布操作参数。 */
interface PublishStoryActionProps {
  completion: number;
  busy: boolean;
  onPublish: () => void;
}

/** 仅在完整度达到 100% 时展示最终发布入口。 */
export function PublishStoryAction({ completion, busy, onPublish }: PublishStoryActionProps) {
  if (completion < 100) return null;
  return (
    <View className="publish-story-action">
      <View className="publish-story-action__copy">
        <Text className="publish-story-action__title">整栋房屋已经点亮</Text>
        <Text className="publish-story-action__subtitle">六处生活片段将组成一篇完整的屋檐记</Text>
      </View>
      <View className={`publish-story-action__button ${busy ? 'publish-story-action__button--disabled' : ''}`} onClick={onPublish}>
        <Text>{busy ? '正在发布' : '完成这篇屋檐记'}</Text>
      </View>
    </View>
  );
}
