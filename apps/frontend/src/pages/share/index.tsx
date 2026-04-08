import { Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';


import { BizError } from '@/shared/api/http';
import { createRental } from '@/shared/api/services';
import { PageShell } from '@/shared/ui/page-shell';

import iconArea from './assets/icons/icon-area.png';
import iconHouse from './assets/icons/icon-house.png';
import iconLocation from './assets/icons/icon-location.png';
import iconPrice from './assets/icons/icon-price.png';
import iconWechat from './assets/icons/icon-wechat.png';
import { FormRow, FormRowDivider } from './components/FormRow';
import { FormSection } from './components/FormSection';
import { PhotoUploader } from './components/PhotoUploader';
import { SubmitBar } from './components/SubmitBar';
import { TagSelector } from './components/TagSelector';


import './index.scss';

const QUICK_TAGS = ['交通便利', '环境安静', '采光好', '性价比高', '邻居友好', '房东靠谱'];
const ROOM_TYPES = ['整租', '合租'];

export default function SharePage() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [roomTypeIndex, setRoomTypeIndex] = useState(-1);
  const [area, setArea] = useState('');
  const [experience, setExperience] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wechat, setWechat] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!price) { void Taro.showToast({ title: '请填写月租价格', icon: 'none' }); return; }
    if (!location) { void Taro.showToast({ title: '请填写所在位置', icon: 'none' }); return; }
    if (roomTypeIndex < 0) { void Taro.showToast({ title: '请选择租住类型', icon: 'none' }); return; }
    if (!experience) { void Taro.showToast({ title: '请填写居住感受', icon: 'none' }); return; }

    setSubmitting(true);
    try {
      // photos 已在选图时上传完毕，此处直接使用服务端 URL
      await createRental({
        price,
        location,
        roomType: ROOM_TYPES[roomTypeIndex],
        area: area || undefined,
        experience,
        tags: selectedTags,
        wechat: wechat || undefined,
        photos
      });

      void Taro.showToast({ title: '发布成功！', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err) {
      const msg = err instanceof BizError ? err.message : '发布失败，请重试';
      void Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <ScrollView scrollY showScrollbar={false} className="share-scroll">
        <FormSection title="实拍图片" subtitle="上传真实房源照片，最多 9 张">
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </FormSection>

        <FormSection title="基本信息">
          <View className="share-form-card">
            <FormRow icon={iconPrice} label="月租价格">
              <Text className="share-unit">¥</Text>
              <Input
                className="share-input"
                type="digit"
                placeholder="请输入月租金额"
                placeholderClass="share-placeholder"
                value={price}
                onInput={(e) => setPrice(e.detail.value)}
              />
            </FormRow>
            <FormRowDivider />
            <FormRow icon={iconLocation} label="所在位置">
              <Input
                className="share-input share-input--flex"
                placeholder="小区名称 / 街道"
                placeholderClass="share-placeholder"
                value={location}
                onInput={(e) => setLocation(e.detail.value)}
              />
            </FormRow>
            <FormRowDivider />
            <Picker
              mode="selector"
              range={ROOM_TYPES}
              value={roomTypeIndex}
              onChange={(e) => setRoomTypeIndex(Number(e.detail.value))}
            >
              <FormRow icon={iconHouse} label="租住类型" arrow>
                <Text className={`share-picker-val${roomTypeIndex < 0 ? ' share-picker-val--empty' : ''}`}>
                  {roomTypeIndex >= 0 ? ROOM_TYPES[roomTypeIndex] : '请选择'}
                </Text>
              </FormRow>
            </Picker>
            <FormRowDivider />
            <FormRow icon={iconArea} label="房屋面积">
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

        <FormSection title="居住感受" subtitle="分享你真实的居住体验，帮助其他人找到合适的家">
          <Textarea
            className="share-textarea"
            placeholder="例如：小区安静，邻居友好，附近有地铁和超市，房东很负责任..."
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
                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
              )
            }
          />
        </FormSection>

        <FormSection title="联系方式">
          <View className="share-form-card">
            <FormRow icon={iconWechat} label="微信号">
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
            <Text className="share-privacy__text">🔒 你的联系方式仅对匹配成功的笔友可见</Text>
          </View>
        </FormSection>
      </ScrollView>

      <SubmitBar loading={submitting} onSubmit={handleSubmit} />
    </PageShell>
  );
}
