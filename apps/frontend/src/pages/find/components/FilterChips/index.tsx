import { ScrollView, Text, View } from '@tarojs/components';

import './index.scss';

export type FilterValue = 'all' | 'subway' | 'whole' | 'shared';

const CHIPS: { label: string; value: FilterValue }[] = [
  { label: '全部', value: 'all' },
  { label: '近地铁', value: 'subway' },
  { label: '整租', value: 'whole' },
  { label: '合租', value: 'shared' }
];

interface Props {
  active: FilterValue;
  onChange: (v: FilterValue) => void;
}

export function FilterChips({ active, onChange }: Props) {
  return (
    <ScrollView scrollX showScrollbar={false} className="filter-chips">
      <View className="filter-chips__row">
        {CHIPS.map((chip) => (
          <View
            key={chip.value}
            className={`filter-chips__chip${active === chip.value ? ' filter-chips__chip--active' : ''}`}
            onClick={() => onChange(chip.value)}
          >
            <Text className={`filter-chips__label${active === chip.value ? ' filter-chips__label--active' : ''}`}>
              {chip.label}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
