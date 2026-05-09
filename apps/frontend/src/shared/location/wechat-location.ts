import Taro from '@tarojs/taro';

/** 对页面屏蔽 Taro.chooseLocation 的原始返回结构，只暴露本业务需要的字段。 */
export interface WechatLocationResult {
  address: string;
  latitude: number;
  longitude: number;
}

/** 调起微信地图选点，并归一化为详细地址加经纬度。 */
export async function chooseWechatLocation(): Promise<WechatLocationResult> {
  const result = await Taro.chooseLocation({});
  const name = result.name?.trim();
  const address = result.address?.trim();
  const displayAddress = [name, address].filter(Boolean).join(' ');

  return {
    address: displayAddress || address || name || '',
    latitude: result.latitude,
    longitude: result.longitude
  };
}
