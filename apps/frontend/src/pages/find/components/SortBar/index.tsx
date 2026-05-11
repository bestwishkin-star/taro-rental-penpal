import { Text, View } from '@tarojs/components';

import './index.scss';

export type SortValue = 'default' | 'price_asc' | 'price_desc' | 'distance' | 'newest';

const SORTS: Array<{ label: string; value: SortValue; altValue?: SortValue }> = [
  { label: '默认排序', value: 'default' },
  { label: '费用', value: 'price_asc', altValue: 'price_desc' },
  { label: '距离', value: 'distance' },
  { label: '屋檐新记', value: 'newest' }
];

interface Props {
  active: SortValue;
  onChange: (value: SortValue) => void;
}

/** 发现页排序条：在费用、距离和最新内容之间切换。 */
export function SortBar({ active, onChange }: Props) {
  function handleClick(item: (typeof SORTS)[number]) {
    if (item.altValue && active === item.value) {
      onChange(item.altValue);
      return;
    }
    onChange(item.value);
  }

  return (
    <View className="sort-bar">
      {SORTS.map((item) => {
        const isActive = active === item.value || active === item.altValue;
        return (
          <View
            key={item.value}
            className={`sort-bar__item${isActive ? ' sort-bar__item--active' : ''}`}
            onClick={() => handleClick(item)}
          >
            <Text className="sort-bar__text">{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
