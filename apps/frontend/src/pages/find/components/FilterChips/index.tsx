import { ScrollView, Text, View } from '@tarojs/components';
import React from 'react';

import type { ListRentalsQuery } from '@shared/contracts/rental';

import './index.scss';

export type FilterValue = 'all' | 'subway' | 'whole' | 'shared' | 'single';
export type PriceRange = ListRentalsQuery['priceRange'];

const ROOM_TYPE_CHIPS: { label: string; value: FilterValue }[] = [
  { label: '全部', value: 'all' },
  { label: '整租', value: 'whole' },
  { label: '合租', value: 'shared' },
  { label: '单间', value: 'single' },
  { label: '近地铁', value: 'subway' }
];

const PRICE_CHIPS: { label: string; value: PriceRange }[] = [
  { label: '不限', value: undefined },
  { label: '2000以下', value: 'lt2000' },
  { label: '2000-4000', value: '2000to4000' },
  { label: '4000以上', value: 'gt4000' }
];

interface Props {
  filter: FilterValue;
  priceRange: PriceRange;
  onFilterChange: (v: FilterValue) => void;
  onPriceRangeChange: (v: PriceRange) => void;
}

function Chip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <View
      className={`filter-chips__chip${active ? ' filter-chips__chip--active' : ''}`}
      onClick={onClick}
    >
      <Text className={`filter-chips__label${active ? ' filter-chips__label--active' : ''}`}>
        {label}
      </Text>
    </View>
  );
}

export function FilterChips({ filter, priceRange, onFilterChange, onPriceRangeChange }: Props) {
  return (
    <View className="filter-chips">
      <ScrollView scrollX showScrollbar={false} className="filter-chips__scroll">
        <View className="filter-chips__row">
          {ROOM_TYPE_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              label={chip.label}
              active={filter === chip.value}
              onClick={() => onFilterChange(chip.value)}
            />
          ))}
        </View>
      </ScrollView>
      <ScrollView scrollX showScrollbar={false} className="filter-chips__scroll">
        <View className="filter-chips__row">
          {PRICE_CHIPS.map((chip) => (
            <Chip
              key={chip.value ?? 'all'}
              label={chip.label}
              active={priceRange === chip.value}
              onClick={() => onPriceRangeChange(chip.value)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
