import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { uploadPhoto } from '@/shared/api/services';

import './index.scss';

interface Props {
  avatarUrl: string;
  onChange: (url: string) => void;
}

export function SettingsAvatar({ avatarUrl, onChange }: Props) {
  async function handleChooseAvatar() {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      const tempFilePath = result.tempFiles[0]?.tempFilePath;
      if (!tempFilePath) return;

      const { url } = await uploadPhoto(tempFilePath);
      onChange(url);
    } catch {
      void Taro.showToast({ title: '头像上传失败', icon: 'none', duration: 2000 });
    }
  }

  return (
    <View className="settings-avatar">
      <Button className="settings-avatar__btn" onClick={() => void handleChooseAvatar()}>
        {avatarUrl ? (
          <Image src={avatarUrl} className="settings-avatar__img" mode="aspectFill" />
        ) : (
          <View className="settings-avatar__placeholder" />
        )}
      </Button>
      <Text className="settings-avatar__hint">点击更换头像</Text>
    </View>
  );
}
