import { Image, Text, View } from '@tarojs/components';

import iconSend from '../../assets/icons/icon-send.png';

import './index.scss';

interface Props {
  text?: string;
  loading?: boolean;
  onSubmit: () => void;
}

export function SubmitBar({ text = '发布分享', loading = false, onSubmit }: Props) {
  return (
    <View className="submit-bar">
      <View
        className={`submit-bar__btn${loading ? ' submit-bar__btn--loading' : ''}`}
        hoverClass="submit-bar__btn--hover"
        onClick={onSubmit}
      >
        <Image src={iconSend} className="submit-bar__icon" mode="aspectFit" />
        <Text className="submit-bar__text">{loading ? '发布中...' : text}</Text>
      </View>
    </View>
  );
}
