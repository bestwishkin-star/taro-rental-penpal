import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { uploadPhoto } from '@/shared/api/services';

import iconAdd from '../../assets/icons/icon-add.png';

import './index.scss';

interface Props {
  photos: string[];
  max?: number;
  onChange: (photos: string[]) => void;
}

export function PhotoUploader({ photos, max = 9, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  function handleAdd() {
    const remaining = max - photos.length;
    if (remaining <= 0) return;

    Taro.requirePrivacyAuthorize({
      success() {
        void Taro.chooseImage({
          count: remaining,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          async success(res) {
            setUploading(true);
            try {
              const urls = await Promise.all(
                res.tempFilePaths.map((p) => uploadPhoto(p).then((r) => r.url))
              );
              onChange([...photos, ...urls].slice(0, max));
            } catch {
              void Taro.showToast({ title: '图片上传失败，请重试', icon: 'none' });
            } finally {
              setUploading(false);
            }
          }
        });
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
        <View className={`photo-uploader__add${uploading ? ' photo-uploader__add--loading' : ''}`} onClick={uploading ? undefined : handleAdd}>
          {uploading ? (
            <Text className="photo-uploader__loading-text">上传中...</Text>
          ) : (
            <Image src={iconAdd} className="photo-uploader__add-icon" mode="aspectFit" />
          )}
        </View>
      )}
    </View>
  );
}
