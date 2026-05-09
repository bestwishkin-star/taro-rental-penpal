import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import iconClose from '@/assets/icons/common/icon-close.png';
import { uploadPhoto } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';

import iconAdd from '../../assets/icons/icon-add.png';

import './index.scss';

interface Props {
  photos: string[];
  max?: number;
  onChange: (photos: string[]) => void;
}

/** 图片上传组件：选择本地图片、上传后回填远端地址列表。 */
export function PhotoUploader({ photos, max = 9, onChange }: Props) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const [uploading, setUploading] = useState(false);

  /** 新增图片：校验登录、授权隐私并按剩余数量选择媒体。 */
  function handleAdd() {
    if (!isLoggedIn) {
      void Taro.showToast({ title: '请先登录后再上传图片', icon: 'none' });
      return;
    }
    const remaining = max - photos.length;
    if (remaining <= 0) return;

    Taro.requirePrivacyAuthorize({
      success() {
        void Taro.chooseMedia({
          count: remaining,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          async success(res) {
            setUploading(true);
            try {
              const urls = await Promise.all(
                res.tempFiles.map((f) => uploadPhoto(f.tempFilePath).then((r) => r.url))
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

  /** 移除指定下标的图片并通知父组件。 */
  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <View className="photo-uploader">
      {/* 已上传图片列表：每张图都提供删除按钮。 */}
      {photos.map((uri, i) => (
        <View key={i} className="photo-uploader__item">
          <View className="photo-uploader__img" style={{ backgroundImage: `url(${uri})` }} />
          <View className="photo-uploader__remove" onClick={() => handleRemove(i)}>
            <Image src={iconClose} className="photo-uploader__remove-icon" mode="aspectFit" />
          </View>
        </View>
      ))}
      {/* 添加按钮：上传中切换为加载态，达到上限后隐藏。 */}
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
