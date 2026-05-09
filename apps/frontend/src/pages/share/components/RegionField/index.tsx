import type { RentalRegionInput } from '@shared/contracts/location';
import { Picker, Text, View } from '@tarojs/components';

import { findRegionIndexes, getRegionByIndexes, REGION_COLUMNS } from '@/shared/location/region-options';

import './index.scss';

/** 发布页区域选择控件的受控属性。 */
interface Props {
  value: RentalRegionInput | null;
  onChange: (value: RentalRegionInput) => void;
}

/** 发布页必填的省市区选择器。 */
export function RegionField({ value, onChange }: Props) {
  /** 将 Picker 返回的索引数组转换为发布表单使用的省市区结构。 */
  function handleChange(event: { detail: { value: number[] } }) {
    onChange(getRegionByIndexes(event.detail.value));
  }

  return (
    // 省市区选择器：发布页基础位置字段。
    <Picker mode="multiSelector" range={REGION_COLUMNS} value={findRegionIndexes(value)} onChange={handleChange}>
      <View className="region-field">
        <Text className={`region-field__value${value ? '' : ' region-field__value--placeholder'}`}>
          {value ? `${value.province} / ${value.city} / ${value.district}` : '请选择省 / 市 / 区'}
        </Text>
      </View>
    </Picker>
  );
}
