import type { RentalCoordinate, RentalRegionInput } from '@shared/contracts/location';
import { Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { BizError } from '@/shared/api/http';
import { createRental } from '@/shared/api/services';
import { buildDisplayLocation, shouldClearPreciseLocation } from '@/shared/location/location-utils';
import { chooseWechatLocation } from '@/shared/location/wechat-location';
import { useAuthStore } from '@/shared/store';
import { PageShell } from '@/shared/ui/page-shell';

import iconArea from './assets/icons/icon-area.png';
import iconHouse from './assets/icons/icon-house.png';
import iconLocation from './assets/icons/icon-location.png';
import iconPrice from './assets/icons/icon-price.png';
import iconWechat from './assets/icons/icon-wechat.png';
import { AddressActions } from './components/AddressActions';
import { FormRow, FormRowDivider } from './components/FormRow';
import { FormSection } from './components/FormSection';
import { PhotoUploader } from './components/PhotoUploader';
import { RegionField } from './components/RegionField';
import { SubmitBar } from './components/SubmitBar';
import { TagSelector } from './components/TagSelector';

import './index.scss';

const QUICK_TAGS = ['近地铁', '可短租', '民用水电', '采光好', '独立卫浴', '可养宠物'];
const ROOM_TYPES = ['整租', '合租'];

export default function SharePage() {
  const { profileStats, patchProfileStats } = useAuthStore();
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [region, setRegion] = useState<RentalRegionInput | null>(null);
  const [address, setAddress] = useState('');
  const [coordinate, setCoordinate] = useState<RentalCoordinate | null>(null);
  const [roomTypeIndex, setRoomTypeIndex] = useState(-1);
  const [area, setArea] = useState('');
  const [experience, setExperience] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wechat, setWechat] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleRegionChange(nextRegion: RentalRegionInput) {
    setRegion((previousRegion) => {
      if (shouldClearPreciseLocation(nextRegion, previousRegion)) {
        setAddress('');
        setCoordinate(null);
      }
      return nextRegion;
    });
  }

  async function handleChooseLocation() {
    try {
      const selected = await chooseWechatLocation();
      setAddress(selected.address);
      setCoordinate({ latitude: selected.latitude, longitude: selected.longitude });
    } catch {
      void Taro.showToast({ title: '未选择地址', icon: 'none' });
    }
  }

  function handleClearAddress() {
    setAddress('');
    setCoordinate(null);
  }

  async function handleSubmit() {
    if (!price) {
      void Taro.showToast({ title: '请填写租金', icon: 'none' });
      return;
    }
    if (!region) {
      void Taro.showToast({ title: '请选择省市区', icon: 'none' });
      return;
    }
    if (roomTypeIndex < 0) {
      void Taro.showToast({ title: '请选择租房类型', icon: 'none' });
      return;
    }
    if (!experience) {
      void Taro.showToast({ title: '请填写房源描述', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await createRental({
        price,
        location: buildDisplayLocation(region, address),
        province: region.province,
        city: region.city,
        district: region.district,
        address: address || undefined,
        latitude: coordinate?.latitude,
        longitude: coordinate?.longitude,
        roomType: ROOM_TYPES[roomTypeIndex],
        area: area || undefined,
        experience,
        tags: selectedTags,
        wechat: wechat || undefined,
        photos
      });

      void Taro.showToast({ title: '发布成功', icon: 'success' });
      patchProfileStats({
        publishCount: profileStats.publishCount + 1
      });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err) {
      const msg = err instanceof BizError ? err.message : '发布失败，请稍后重试';
      void Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <ScrollView scrollY showScrollbar={false} className="share-scroll">
        <FormSection title="房源照片" subtitle="建议上传真实清晰的房间、客厅或周边照片">
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </FormSection>

        <FormSection title="基础信息">
          <View className="share-form-card">
            <FormRow icon={iconPrice} label="月租">
              <Text className="share-unit">¥</Text>
              <Input
                className="share-input"
                type="digit"
                placeholder="请输入租金"
                placeholderClass="share-placeholder"
                value={price}
                onInput={(e) => setPrice(e.detail.value)}
              />
            </FormRow>
            <FormRowDivider />
            <FormRow icon={iconLocation} label="位置">
              <RegionField value={region} onChange={handleRegionChange} />
            </FormRow>
            <AddressActions address={address} onChooseLocation={handleChooseLocation} onClear={handleClearAddress} />
            <FormRowDivider />
            <Picker
              mode="selector"
              range={ROOM_TYPES}
              value={roomTypeIndex}
              onChange={(e) => setRoomTypeIndex(Number(e.detail.value))}
            >
              <FormRow icon={iconHouse} label="租房类型" arrow>
                <Text className={`share-picker-val${roomTypeIndex < 0 ? ' share-picker-val--empty' : ''}`}>
                  {roomTypeIndex >= 0 ? ROOM_TYPES[roomTypeIndex] : '请选择'}
                </Text>
              </FormRow>
            </Picker>
            <FormRowDivider />
            <FormRow icon={iconArea} label="面积">
              <Input
                className="share-input"
                type="digit"
                placeholder="请输入面积"
                placeholderClass="share-placeholder"
                value={area}
                onInput={(e) => setArea(e.detail.value)}
              />
              <Text className="share-unit">㎡</Text>
            </FormRow>
          </View>
        </FormSection>

        <FormSection title="房源描述" subtitle="写清入住时间、室友情况、通勤和看房方式">
          <Textarea
            className="share-textarea"
            placeholder="例如：近地铁，卧室朝南，适合一人居住..."
            placeholderClass="share-placeholder"
            value={experience}
            onInput={(e) => setExperience(e.detail.value)}
            maxlength={500}
            showConfirmBar={false}
          />
          <TagSelector
            tags={QUICK_TAGS}
            selected={selectedTags}
            onToggle={(tag) =>
              setSelectedTags((prev) =>
                prev.includes(tag) ? prev.filter((current) => current !== tag) : [...prev, tag]
              )
            }
          />
        </FormSection>

        <FormSection title="联系方式">
          <View className="share-form-card">
            <FormRow icon={iconWechat} label="微信">
              <Input
                className="share-input share-input--flex"
                placeholder="请输入微信号"
                placeholderClass="share-placeholder"
                value={wechat}
                onInput={(e) => setWechat(e.detail.value)}
              />
            </FormRow>
          </View>
          <View className="share-privacy">
            <Text className="share-privacy__text">联系方式仅用于租客沟通，请勿填写敏感证件信息。</Text>
          </View>
        </FormSection>
      </ScrollView>

      <SubmitBar loading={submitting} onSubmit={handleSubmit} />
    </PageShell>
  );
}
