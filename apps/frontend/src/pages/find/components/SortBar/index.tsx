import { Image, Text, View } from '@tarojs/components';

import iconChevron from '@/assets/icons/find/icon-chevron-down.png';

import './index.scss';

export type SortValue = 'default' | 'price_asc' | 'price_desc' | 'newest';

interface SortOption {
  label: string;
  value: SortValue;
  altValue?: SortValue;
}

const OPTIONS: SortOption[] = [
  { label: '综合排序', value: 'default' },
  { label: '租金', value: 'price_asc', altValue: 'price_desc' },
  { label: '最新发布', value: 'newest' }
];

interface Props {
  active: SortValue;
  onChange: (v: SortValue) => void;
}

export function SortBar({ active, onChange }: Props) {
  function handleTap(option: SortOption) {
    if (active === option.value) {
      onChange(option.altValue ?? option.value);
    } else if (option.altValue && active === option.altValue) {
      onChange(option.value);
    } else {
      onChange(option.value);
    }
  }

  return (
    <View className="sort-bar">
      {OPTIONS.map((option, index) => {
        const isActive = active === option.value || active === option.altValue;
        return (
          <View key={option.value} className="sort-bar__item-wrap">
            {index > 0 && <View className="sort-bar__divider" />}
            <View
              className={`sort-bar__item${isActive ? ' sort-bar__item--active' : ''}`}
              onClick={() => handleTap(option)}
            >
              <Text className={`sort-bar__label${isActive ? ' sort-bar__label--active' : ''}`}>
                {option.label}
              </Text>
              <Image
                src={iconChevron}
                className={`sort-bar__chevron${active === option.altValue ? ' sort-bar__chevron--up' : ''}`}
                mode="aspectFit"
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
