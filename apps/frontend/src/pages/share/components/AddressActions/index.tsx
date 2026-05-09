import { Text, View } from '@tarojs/components';

import './index.scss';

/** 发布页详细地址操作区的受控属性。 */
interface Props {
  address: string;
  onChooseLocation: () => void | Promise<void>;
  onClear: () => void;
}

/** 展示地图选点入口、清除入口和当前详细地址预览。 */
export function AddressActions({ address, onChooseLocation, onClear }: Props) {
  return (
    <View className="address-actions">
      <View className="address-actions__buttons">
        <View className="address-actions__button" onClick={onChooseLocation}>
          <Text className="address-actions__button-text">选择地图位置</Text>
        </View>
        <View className="address-actions__button address-actions__button--secondary" onClick={onClear}>
          <Text className="address-actions__button-text address-actions__button-text--secondary">清除地址</Text>
        </View>
      </View>
      <Text className={`address-actions__value${address ? '' : ' address-actions__value--placeholder'}`}>
        {address || '可选：补充小区、楼栋或附近地标'}
      </Text>
    </View>
  );
}
