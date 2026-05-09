import { Image, Text, View } from '@tarojs/components';

import iconChevronRight from '@/assets/icons/common/icon-chevron-right.png';

import './index.scss';

interface Props {
  icon: string;
  label: string;
  desc: string;
  onClick: () => void;
}

/** 首页快捷入口卡片：展示图标、标题、说明和右侧箭头。 */
export function ActionCard({ icon, label, desc, onClick }: Props) {
  return (
    <View
      className="action-card"
      hoverClass="action-card--active"
      onClick={onClick}
    >
      {/* 左侧图标用于区分找房和发布两个主要动作。 */}
      <Image src={icon} className="action-card__icon" mode="aspectFit" />
      <View className="action-card__body">
        <Text className="action-card__label">{label}</Text>
        <Text className="action-card__desc">{desc}</Text>
      </View>
      <Image src={iconChevronRight} className="action-card__arrow" mode="aspectFit" />
    </View>
  );
}
