import type { RentalRegionInput } from '@shared/contracts/location';
import { Picker, Text, View } from '@tarojs/components';

import { formatRegionSummary } from '@/shared/location/location-utils';
import { findRegionIndexes, getRegionByIndexes, REGION_COLUMNS } from '@/shared/location/region-options';

import './index.scss';

/** 找房页区域筛选器的受控属性，null 表示不过滤区域。 */
interface Props {
  value: RentalRegionInput | null;
  onChange: (value: RentalRegionInput | null) => void;
}

/** 找房页区域筛选控件，支持选择区域和清空筛选。 */
export function RegionFilter({ value, onChange }: Props) {
  /** 将 Picker 返回的索引数组转换为省市区结构。 */
  function handleChange(event: { detail: { value: number[] } }) {
    onChange(getRegionByIndexes(event.detail.value));
  }

  return (
    <View className="region-filter">
      {/* 地区选择器：按省、市、区三级列展示。 */}
      <Picker mode="multiSelector" range={REGION_COLUMNS} value={findRegionIndexes(value)} onChange={handleChange}>
        <View className="region-filter__trigger">
          <Text className={`region-filter__value${value ? '' : ' region-filter__value--placeholder'}`}>
            {formatRegionSummary(value)}
          </Text>
        </View>
      </Picker>
      {/* 清除按钮：恢复不限地区状态。 */}
      {value && (
        <View className="region-filter__clear" onClick={() => onChange(null)}>
          <Text className="region-filter__clear-text">清除</Text>
        </View>
      )}
    </View>
  );
}
