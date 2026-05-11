import type { RentalRegionInput } from '@shared/contracts/location';
import { Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { BizError } from '@/shared/api/http';
import { createRental, fetchRental, updateRentalSupplement } from '@/shared/api/services';
import { buildDisplayLocation } from '@/shared/location/location-utils';
import { useAuthStore } from '@/shared/store';
import { PageShell } from '@/shared/ui/page-shell';

import iconArea from './assets/icons/icon-area.png';
import iconHouse from './assets/icons/icon-house.png';
import iconLocation from './assets/icons/icon-location.png';
import iconPrice from './assets/icons/icon-price.png';
import { FormRow, FormRowDivider } from './components/FormRow';
import { FormSection } from './components/FormSection';
import { PhotoUploader } from './components/PhotoUploader';
import { RegionField } from './components/RegionField';
import { SubmitBar } from './components/SubmitBar';
import { RENTAL_TYPES, ROOM_TYPES, STAY_STAGES } from './share-options';
import { validateRentalSupplementDraft, validateShareExperienceDraft } from './share-validation';

import './index.scss';

type InputEvent = { detail: { value: string } };
type PickerChangeEvent = { detail: { value: string | number } };
type TextareaInputEvent = { detail: { value: string } };

function getPickerIndex(event: PickerChangeEvent) {
  return Number(event.detail.value);
}

function getRouteId() {
  const params = Taro.getCurrentInstance().router?.params;
  return typeof params?.id === 'string' && params.id ? params.id : undefined;
}

/** 屋檐记发布页：首次记录居住体验，或从我的屋檐记进入补充参考信息。 */
export default function SharePage() {
  const { profileStats, patchProfileStats } = useAuthStore();
  const [rentalId, setRentalId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [region, setRegion] = useState<RentalRegionInput | null>(null);
  const [landmark, setLandmark] = useState('');
  const [roomTypeIndex, setRoomTypeIndex] = useState(-1);
  const [rentalTypeIndex, setRentalTypeIndex] = useState(1);
  const [stayStageIndex, setStayStageIndex] = useState(-1);
  const [area, setArea] = useState('');
  const [commute, setCommute] = useState('');
  const [experience, setExperience] = useState('');
  const [truthPledge, setTruthPledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isSupplementMode = Boolean(rentalId);

  useEffect(() => {
    const id = getRouteId();
    if (!id) return;

    setRentalId(id);
    void Taro.setNavigationBarTitle({ title: '补充参考信息' });
    fetchRental(id)
      .then((data) => {
        setPrice(data.price === '待补充' ? '' : data.price || '');
        setRegion(
          data.province && data.city && data.district
            ? { province: data.province, city: data.city, district: data.district }
            : null
        );
        setLandmark(data.landmark || '');
        setRoomTypeIndex(
          data.roomType && data.roomType !== '待补充' ? ROOM_TYPES.indexOf(data.roomType) : -1
        );

        const rentalTypeIndexFromData = RENTAL_TYPES.findIndex((item) => item.value === data.rentalType);
        setRentalTypeIndex(rentalTypeIndexFromData >= 0 ? rentalTypeIndexFromData : 1);
        setStayStageIndex(
          data.stayStage ? STAY_STAGES.findIndex((item) => item.value === data.stayStage) : -1
        );
        setArea(data.area || '');
        setCommute(data.commute || '');
      })
      .catch(() => void Taro.showToast({ title: '加载补充信息失败', icon: 'none' }));
  }, []);

  function handleRegionChange(nextRegion: RentalRegionInput) {
    setRegion(nextRegion);
  }

  function handlePriceInput(event: InputEvent) {
    setPrice(event.detail.value);
  }

  function handleLandmarkInput(event: InputEvent) {
    setLandmark(event.detail.value);
  }

  function handleAreaInput(event: InputEvent) {
    setArea(event.detail.value);
  }

  function handleCommuteInput(event: InputEvent) {
    setCommute(event.detail.value);
  }

  function handleExperienceInput(event: TextareaInputEvent) {
    setExperience(event.detail.value);
  }

  async function handleSubmit() {
    if (isSupplementMode) {
      await handleSupplementSubmit();
      return;
    }
    await handleCreateSubmit();
  }

  /** 首次记录只提交真实居住体验，不强制填写费用、区域、空间等参考信息。 */
  async function handleCreateSubmit() {
    const validationError = validateShareExperienceDraft({ experience, photos, truthPledge });
    if (validationError) {
      void Taro.showToast({ title: validationError, icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      await createRental({
        title: experience.trim().slice(0, 28),
        location: '待补充',
        experience: experience.trim(),
        tags: [],
        photos,
        truthPledge
      });

      void Taro.showToast({ title: '屋檐记已发布', icon: 'success' });
      patchProfileStats({ publishCount: profileStats.publishCount + 1 });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err) {
      const msg = err instanceof BizError ? err.message : '屋檐记发布失败，请稍后再试';
      void Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  /** 从我的屋檐记进入后补充费用、区域、空间等参考信息。 */
  async function handleSupplementSubmit() {
    const stayStage = stayStageIndex >= 0 ? STAY_STAGES[stayStageIndex].value : undefined;
    const validationError = validateRentalSupplementDraft({
      price,
      region,
      landmark,
      roomTypeIndex,
      stayStage
    });
    if (validationError) {
      void Taro.showToast({ title: validationError, icon: 'none' });
      return;
    }
    if (!rentalId || !region || !stayStage) return;

    setSubmitting(true);
    try {
      const regionText = buildDisplayLocation(region);
      await updateRentalSupplement(rentalId, {
        price: price.trim(),
        location: `${regionText} ${landmark.trim()}`.trim(),
        province: region.province,
        city: region.city,
        district: region.district,
        landmark: landmark.trim(),
        roomType: ROOM_TYPES[roomTypeIndex],
        rentalType: RENTAL_TYPES[rentalTypeIndex].value,
        stayStage,
        area: area.trim() || undefined,
        commute: commute.trim() || undefined
      });
      void Taro.showToast({ title: '补充成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1200);
    } catch (err) {
      const msg = err instanceof BizError ? err.message : '补充失败，请稍后再试';
      void Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  const referenceSection = (
    <FormSection
      title="参考信息"
      subtitle={
        isSupplementMode
          ? '这些信息会展示在详情页，帮助其他人判断参考价值。'
          : '落笔后，可在我的屋檐记里补充这部分信息。'
      }
    >
      <View className="share-form-card">
        <FormRow icon={iconPrice} label="费用">
          <Text className="share-unit">�</Text>
          <Input
            className="share-input"
            type="digit"
            placeholder="每月费用"
            placeholderClass="share-placeholder"
            value={price}
            onInput={handlePriceInput}
          />
        </FormRow>
        <FormRowDivider />
        <FormRow icon={iconLocation} label="城市区域">
          <RegionField value={region} onChange={handleRegionChange} />
        </FormRow>
        <FormRowDivider />
        <FormRow icon={iconLocation} label="地点地标">
          <Input
            className="share-input share-input--flex"
            placeholder="例如：望京 SOHO 附近"
            placeholderClass="share-placeholder"
            value={landmark}
            onInput={handleLandmarkInput}
          />
        </FormRow>
        <FormRowDivider />
        <Picker
          mode="selector"
          range={ROOM_TYPES}
          value={roomTypeIndex}
          onChange={(event) => setRoomTypeIndex(getPickerIndex(event))}
        >
          <FormRow icon={iconHouse} label="空间类型" arrow>
            <Text
              className={`share-picker-val${roomTypeIndex < 0 ? ' share-picker-val--empty' : ''}`}
            >
              {roomTypeIndex >= 0 ? ROOM_TYPES[roomTypeIndex] : '请选择'}
            </Text>
          </FormRow>
        </Picker>
        <FormRowDivider />
        <Picker
          mode="selector"
          range={RENTAL_TYPES.map((item) => item.label)}
          value={rentalTypeIndex}
          onChange={(event) => setRentalTypeIndex(getPickerIndex(event))}
        >
          <FormRow icon={iconHouse} label="居住方式" arrow>
            <Text className="share-picker-val">{RENTAL_TYPES[rentalTypeIndex].label}</Text>
          </FormRow>
        </Picker>
        <FormRowDivider />
        <Picker
          mode="selector"
          range={STAY_STAGES.map((item) => item.label)}
          value={stayStageIndex}
          onChange={(event) => setStayStageIndex(getPickerIndex(event))}
        >
          <FormRow icon={iconHouse} label="居住阶段" arrow>
            <Text
              className={`share-picker-val${stayStageIndex < 0 ? ' share-picker-val--empty' : ''}`}
            >
              {stayStageIndex >= 0 ? STAY_STAGES[stayStageIndex].label : '请选择'}
            </Text>
          </FormRow>
        </Picker>
        <FormRowDivider />
        <FormRow icon={iconArea} label="面积">
          <Input
            className="share-input"
            type="digit"
            placeholder="选填"
            placeholderClass="share-placeholder"
            value={area}
            onInput={handleAreaInput}
          />
          <Text className="share-unit">㎡</Text>
        </FormRow>
        <FormRowDivider />
        <FormRow icon={iconLocation} label="通勤">
          <Input
            className="share-input share-input--flex"
            placeholder="例如：到 14 号线步行 8 分钟"
            placeholderClass="share-placeholder"
            value={commute}
            onInput={handleCommuteInput}
          />
        </FormRow>
      </View>
    </FormSection>
  );

  return (
    <PageShell>
      <ScrollView scrollY showScrollbar={false} className="share-scroll">
        {!isSupplementMode && (
          <>
            <FormSection
              title="一方屋檐下"
              subtitle="写下这处屋檐里的采光、隔音、通勤和相处，帮后来的人判断是否适合自己。"
            >
              <Textarea
                className="share-textarea share-textarea--note"
                placeholder="可以写通勤、采光、隔音、同住体验、费用、周边生活和你绕过的坑。"
                placeholderClass="share-placeholder"
                value={experience}
                onInput={handleExperienceInput}
                maxlength={600}
                autoHeight
                showConfirmBar={false}
              />
              <Text className="share-text-count">{experience.length}/600</Text>
            </FormSection>

            <FormSection
              title="照片"
              subtitle="至少上传 1 张。避免公开门牌号、合同号、手机号等隐私信息。"
            >
              <PhotoUploader photos={photos} onChange={setPhotos} />
            </FormSection>

            <View className="share-pledge" onClick={() => setTruthPledge((value) => !value)}>
              <View
                className={`share-pledge__box${truthPledge ? ' share-pledge__box--checked' : ''}`}
              >
                <Text className="share-pledge__mark">{truthPledge ? '✓' : ''}</Text>
              </View>
              <Text className="share-pledge__text">同意并承诺内容来自真实居住体验</Text>
            </View>
          </>
        )}

        {isSupplementMode && referenceSection}
      </ScrollView>

      <SubmitBar
        text={isSupplementMode ? '保存补充信息' : '写下屋檐记'}
        loading={submitting}
        onSubmit={handleSubmit}
      />
    </PageShell>
  );
}
