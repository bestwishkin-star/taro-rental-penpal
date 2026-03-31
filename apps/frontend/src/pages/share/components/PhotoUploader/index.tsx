import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import iconAdd from '../../assets/icons/icon-add.png';

import './index.scss';

interface Props {
  photos: string[];
  max?: number;
  onChange: (photos: string[]) => void;
}

export function PhotoUploader({ photos, max = 9, onChange }: Props) {
  function handleAdd() {
    const remaining = max - photos.length;
    if (remaining <= 0) return;
    void Taro.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        onChange([...photos, ...res.tempFilePaths].slice(0, max));
      }
    });
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View className="photo-uploader">
      {photos.map((uri, i) => (
        <View key={i} className="photo-uploader__item">
          <View className="photo-uploader__img" style={{ backgroundImage: `url(${uri})` }} />
          <View className="photo-uploader__remove" onClick={() => handleRemove(i)}>
            <Text className="photo-uploader__remove-icon">×</Text>
          </View>
        </View>
      ))}
      {photos.length < max && (
        <View className="photo-uploader__add" onClick={handleAdd}>
          <Image src={iconAdd} className="photo-uploader__add-icon" mode="aspectFit" />
        </View>
      )}
    </View>
  );
}
