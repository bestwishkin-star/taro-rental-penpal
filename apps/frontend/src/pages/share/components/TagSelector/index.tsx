import { Text, View } from '@tarojs/components';

import './index.scss';

interface Props {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

/** 标签选择器：支持多选快捷标签并高亮已选项。 */
export function TagSelector({ tags, selected, onToggle }: Props) {
  return (
    <View className="tag-selector">
      {tags.map((tag) => (
        <View
          key={tag}
          className={`tag-selector__tag${selected.includes(tag) ? ' tag-selector__tag--active' : ''}`}
          onClick={() => onToggle(tag)}
        >
          <Text className="tag-selector__text">{tag}</Text>
        </View>
      ))}
    </View>
  );
}
