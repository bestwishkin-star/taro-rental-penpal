import { Image, Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import iconAdd from '@/assets/icons/share/icon-add.png';
import iconArea from '@/assets/icons/share/icon-area.png';
import iconHouse from '@/assets/icons/share/icon-house.png';
import iconLocation from '@/assets/icons/share/icon-location.png';
import iconPrice from '@/assets/icons/share/icon-price.png';
import iconSend from '@/assets/icons/share/icon-send.png';
import iconWechat from '@/assets/icons/share/icon-wechat.png';
import { PageShell } from '@/shared/ui/page-shell';

import './index.scss';

const QUICK_TAGS = ['交通便利', '环境安静', '采光好', '性价比高', '邻居友好', '房东靠谱'];
const ROOM_TYPES = ['整租', '合租'];
const MAX_PHOTOS = 9;

export default function SharePage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [roomTypeIndex, setRoomTypeIndex] = useState<number>(-1);
  const [area, setArea] = useState('');
  const [experience, setExperience] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wechat, setWechat] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleChoosePhoto() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;

    void Taro.chooseImage({
      count: remaining,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        setPhotos((prev) => [...prev, ...res.tempFilePaths].slice(0, MAX_PHOTOS));
      }
    });
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleToggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSubmit() {
    if (!price) {
      void Taro.showToast({ title: '请填写月租价格', icon: 'none' });
      return;
    }
    if (!location) {
      void Taro.showToast({ title: '请填写所在位置', icon: 'none' });
      return;
    }
    if (roomTypeIndex < 0) {
      void Taro.showToast({ title: '请选择租住类型', icon: 'none' });
      return;
    }
    if (!experience) {
      void Taro.showToast({ title: '请填写居住感受', icon: 'none' });
      return;
    }

    setSubmitting(true);
    // TODO: 调用后端 API 提交
    setTimeout(() => {
      setSubmitting(false);
      void Taro.showToast({ title: '发布成功！', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    }, 1000);
  }

  return (
    <PageShell>
      <ScrollView scrollY showScrollbar={false} className="share-scroll">
        {/* 实拍图片 */}
        <View className="share-section">
          <Text className="share-section__title">实拍图片</Text>
          <Text className="share-section__subtitle">上传真实房源照片，最多 {MAX_PHOTOS} 张</Text>
          <View className="share-photo-grid">
            {photos.map((uri, i) => (
              <View key={i} className="share-photo-item">
                <View className="share-photo-img" style={{ backgroundImage: `url(${uri})` }} />
                <View className="share-photo-remove" onClick={() => handleRemovePhoto(i)}>
                  <Text className="share-photo-remove__icon">×</Text>
                </View>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <View className="share-photo-add" onClick={handleChoosePhoto}>
                <Image src={iconAdd} className="share-photo-add__icon" mode="aspectFit" />
              </View>
            )}
          </View>
        </View>

        {/* 基本信息 */}
        <View className="share-section">
          <Text className="share-section__title">基本信息</Text>
          <View className="share-form">
            {/* 月租价格 */}
            <View className="share-form-row">
              <Image src={iconPrice} className="share-form-row__icon" mode="aspectFit" />
              <Text className="share-form-row__label">月租价格</Text>
              <View className="share-form-row__input-wrap">
                <Text className="share-form-row__unit">¥</Text>
                <Input
                  className="share-form-row__input"
                  type="digit"
                  placeholder="请输入月租金额"
                  placeholderClass="share-input-placeholder"
                  value={price}
                  onInput={(e) => setPrice(e.detail.value)}
                />
              </View>
            </View>
            <View className="share-form-divider" />

            {/* 所在位置 */}
            <View className="share-form-row">
              <Image src={iconLocation} className="share-form-row__icon" mode="aspectFit" />
              <Text className="share-form-row__label">所在位置</Text>
              <Input
                className="share-form-row__input share-form-row__input--flex"
                placeholder="小区名称 / 街道"
                placeholderClass="share-input-placeholder"
                value={location}
                onInput={(e) => setLocation(e.detail.value)}
              />
            </View>
            <View className="share-form-divider" />

            {/* 租住类型 */}
            <Picker
              mode="selector"
              range={ROOM_TYPES}
              value={roomTypeIndex}
              onChange={(e) => setRoomTypeIndex(Number(e.detail.value))}
            >
              <View className="share-form-row share-form-row--picker">
                <Image src={iconHouse} className="share-form-row__icon" mode="aspectFit" />
                <Text className="share-form-row__label">租住类型</Text>
                <Text
                  className={`share-form-row__picker-value${roomTypeIndex < 0 ? ' share-form-row__picker-value--placeholder' : ''}`}
                >
                  {roomTypeIndex >= 0 ? ROOM_TYPES[roomTypeIndex] : '请选择'}
                </Text>
                <Text className="share-form-row__arrow">›</Text>
              </View>
            </Picker>
            <View className="share-form-divider" />

            {/* 房屋面积 */}
            <View className="share-form-row">
              <Image src={iconArea} className="share-form-row__icon" mode="aspectFit" />
              <Text className="share-form-row__label">房屋面积</Text>
              <View className="share-form-row__input-wrap">
                <Input
                  className="share-form-row__input"
                  type="digit"
                  placeholder="请输入面积"
                  placeholderClass="share-input-placeholder"
                  value={area}
                  onInput={(e) => setArea(e.detail.value)}
                />
                <Text className="share-form-row__unit share-form-row__unit--right">㎡</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 居住感受 */}
        <View className="share-section">
          <Text className="share-section__title">居住感受</Text>
          <Text className="share-section__subtitle">
            分享你真实的居住体验，帮助其他人找到合适的家
          </Text>
          <Textarea
            className="share-textarea"
            placeholder="例如：小区安静，邻居友好，附近有地铁和超市，房东很负责任..."
            placeholderClass="share-input-placeholder"
            value={experience}
            onInput={(e) => setExperience(e.detail.value)}
            maxlength={500}
            showConfirmBar={false}
          />
          <View className="share-tags">
            {QUICK_TAGS.map((tag) => (
              <View
                key={tag}
                className={`share-tag${selectedTags.includes(tag) ? ' share-tag--active' : ''}`}
                onClick={() => handleToggleTag(tag)}
              >
                <Text className="share-tag__text">{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 联系方式 */}
        <View className="share-section">
          <Text className="share-section__title">联系方式</Text>
          <View className="share-form">
            <View className="share-form-row">
              <Image src={iconWechat} className="share-form-row__icon" mode="aspectFit" />
              <Text className="share-form-row__label">微信号</Text>
              <Input
                className="share-form-row__input share-form-row__input--flex"
                placeholder="请输入微信号"
                placeholderClass="share-input-placeholder"
                value={wechat}
                onInput={(e) => setWechat(e.detail.value)}
              />
            </View>
          </View>
          <View className="share-privacy">
            <Text className="share-privacy__text">🔒 你的联系方式仅对匹配成功的笔友可见</Text>
          </View>
        </View>
      </ScrollView>

      {/* 底部发布按钮 */}
      <View className="share-bottom">
        <View
          className={`share-submit${submitting ? ' share-submit--loading' : ''}`}
          hoverClass="share-submit--hover"
          onClick={handleSubmit}
        >
          <Image src={iconSend} className="share-submit__icon" mode="aspectFit" />
          <Text className="share-submit__text">{submitting ? '发布中...' : '发布分享'}</Text>
        </View>
      </View>
    </PageShell>
  );
}
