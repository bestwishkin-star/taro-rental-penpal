import { Image, Text, View } from '@tarojs/components';

import iconPrivacy from '@/assets/icons/home-v2/icon-privacy.png';

import './index.scss';

/** 首页行内隐私提示。 */
export function PrivacyNote() {
  return (
    <View className="privacy-note">
      <Image className="privacy-note__icon" src={iconPrivacy} mode="aspectFit" />
      <Text className="privacy-note__text">记录前请隐藏门牌号、合同号等隐私信息</Text>
    </View>
  );
}
