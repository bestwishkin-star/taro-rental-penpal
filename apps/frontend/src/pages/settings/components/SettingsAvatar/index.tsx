import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { uploadPhoto } from '@/shared/api/services';

import './index.scss';

interface Props {
  avatarUrl: string;
  onChange: (url: string) => void;
}

export function SettingsAvatar({ avatarUrl, onChange }: Props) {
  async function handleChooseAvatar(e: { detail: { avatarUrl: string } }) {
    const tempFilePath = e.detail.avatarUrl;
    try {
      const { url } = await uploadPhoto(tempFilePath);
      onChange(url);
    } catch {
      void Taro.showToast({ title: '头像上传失败', icon: 'none', duration: 2000 });
    }
  }

  return (
    <View className="settings-avatar">
      <Button
        className="settings-avatar__btn"
        openType="chooseAvatar"
        onChooseAvatar={handleChooseAvatar as any}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            className="settings-avatar__img"
            mode="aspectFill"
          />
        ) : (
          <View className="settings-avatar__placeholder" />
        )}
      </Button>
      <Text className="settings-avatar__hint">点击更换头像</Text>
    </View>
  );
}
