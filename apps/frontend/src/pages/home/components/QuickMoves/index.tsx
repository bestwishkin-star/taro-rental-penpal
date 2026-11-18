import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import iconArrowLight from '@/assets/icons/home-v2/icon-arrow-light.png';
import iconRecord from '@/assets/icons/home-v2/icon-record.png';
import iconStories from '@/assets/icons/home-v2/icon-stories.png';

import './index.scss';

/** 首页非对称核心入口。 */
export function QuickMoves() {
  return (
    <View className="quick-moves">
      <Text className="quick-moves__title">继续探索</Text>
      <View className="quick-moves__row">
        <View
          className="quick-moves__action quick-moves__action--stories"
          hoverClass="quick-moves__action--active"
          onClick={() => void Taro.switchTab({ url: '/pages/find/index' })}
        >
          <View className="quick-moves__top">
            <Image className="quick-moves__stories-icon" src={iconStories} mode="aspectFit" />
            <Image className="quick-moves__arrow" src={iconArrowLight} mode="aspectFit" />
          </View>
          <View className="quick-moves__copy">
            <Text className="quick-moves__stories-title">翻看屋檐故事</Text>
            <Text className="quick-moves__stories-hint">从别人的日常里，发现真实居住细节</Text>
          </View>
        </View>

        <View
          className="quick-moves__action quick-moves__action--record"
          hoverClass="quick-moves__action--active"
          onClick={() => void Taro.navigateTo({ url: '/pages/share/index' })}
        >
          <View className="quick-moves__record-icon-wrap">
            <Image className="quick-moves__record-icon" src={iconRecord} mode="aspectFit" />
          </View>
          <View className="quick-moves__copy">
            <Text className="quick-moves__record-title">记录我的屋檐</Text>
            <Text className="quick-moves__record-hint">补充此刻的居住体验</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
