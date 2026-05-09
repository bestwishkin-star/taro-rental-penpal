import { Image, Text, View } from '@tarojs/components';

import iconChevron from '@/assets/icons/find/icon-chevron-down.png';

import './index.scss';

export type SortValue = 'default' | 'price_asc' | 'price_desc' | 'newest' | 'distance';

// 排序项模型：altValue 用于同一按钮在升序和降序之间切换。
interface SortOption {
  label: string;
  value: SortValue;
  altValue?: SortValue;
}

// 找房列表排序项，顺序即页面展示顺序。
const OPTIONS: SortOption[] = [
  { label: '综合排序', value: 'default' },
  { label: '租金', value: 'price_asc', altValue: 'price_desc' },
  { label: '按区域距离', value: 'distance' },
  { label: '最新发布', value: 'newest' }
];

interface Props {
  active: SortValue;
  onChange: (v: SortValue) => void;
}

/** 找房排序栏：处理排序项选中和价格升降序切换。 */
export function SortBar({ active, onChange }: Props) {
  /** 点击排序项时，在主值和备用值之间切换。 */
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
      {/* 排序按钮组：按 OPTIONS 顺序渲染并在激活时高亮。 */}
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
              {option.altValue && (
                <Image
                  src={iconChevron}
                  className={`sort-bar__chevron${active === option.altValue ? ' sort-bar__chevron--up' : ''}`}
                  mode="aspectFit"
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
