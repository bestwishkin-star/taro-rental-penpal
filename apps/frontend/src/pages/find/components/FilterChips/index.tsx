import { Text, View } from '@tarojs/components';

import './index.scss';

export type FilterValue = 'all' | 'whole' | 'shared' | 'single' | 'near_subway';
export type PriceRange = 'lt2000' | '2000to4000' | 'gt4000' | undefined;

const FILTERS: Array<{ label: string; value: FilterValue }> = [
  { label: '全部', value: 'all' },
  { label: '独住', value: 'whole' },
  { label: '同住', value: 'shared' },
  { label: '单间', value: 'single' },
  { label: '近交通', value: 'near_subway' }
];

const PRICE_FILTERS: Array<{ label: string; value: PriceRange }> = [
  { label: '不限', value: undefined },
  { label: '2000 以下', value: 'lt2000' },
  { label: '2000-4000', value: '2000to4000' },
  { label: '4000 以上', value: 'gt4000' }
];

interface Props {
  filter: FilterValue;
  priceRange: PriceRange;
  onFilterChange: (value: FilterValue) => void;
  onPriceRangeChange: (value: PriceRange) => void;
}

/** 发现页筛选条：按居住方式和费用范围缩小社区内容流。 */
export function FilterChips({ filter, priceRange, onFilterChange, onPriceRangeChange }: Props) {
  return (
    <View className="filter-chips">
      <View className="filter-chips__group">
        <Text className="filter-chips__title">居住方式</Text>
        <View className="filter-chips__row">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <View
                key={item.value}
                className={`filter-chips__chip${active ? ' filter-chips__chip--active' : ''}`}
                onClick={() => onFilterChange(item.value)}
              >
                <Text className={`filter-chips__text${active ? ' filter-chips__text--active' : ''}`}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <View className="filter-chips__group">
        <Text className="filter-chips__title">费用范围</Text>
        <View className="filter-chips__row">
          {PRICE_FILTERS.map((item) => {
            const active = priceRange === item.value;
            return (
              <View
                key={item.value || 'all'}
                className={`filter-chips__chip${active ? ' filter-chips__chip--active' : ''}`}
                onClick={() => onPriceRangeChange(item.value)}
              >
                <Text className={`filter-chips__text${active ? ' filter-chips__text--active' : ''}`}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
