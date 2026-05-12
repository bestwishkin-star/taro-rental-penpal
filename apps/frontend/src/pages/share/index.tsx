import { ScrollView, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { BizError } from '@/shared/api/http';
import { createRental } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { PageShell } from '@/shared/ui/page-shell';

import { FormSection } from './components/FormSection';
import { PhotoUploader } from './components/PhotoUploader';
import { SubmitBar } from './components/SubmitBar';
import { validateShareExperienceDraft } from './share-validation';

import './index.scss';

type TextareaInputEvent = { detail: { value: string } };

const TEXT = {
  published: '\u5c4b\u6a90\u8bb0\u5df2\u53d1\u5e03',
  publishFailed: '\u5c4b\u6a90\u8bb0\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5',
  storyTitle: '\u4e00\u65b9\u5c4b\u6a90\u4e0b',
  storySubtitle:
    '\u5199\u4e0b\u8fd9\u5904\u5c4b\u6a90\u91cc\u7684\u771f\u5b9e\u751f\u6d3b\u3002\u7167\u7247\u548c\u6587\u5b57\uff0c\u4f1a\u6bd4\u51b7\u51b0\u51b0\u7684\u8868\u683c\u66f4\u80fd\u5e2e\u540e\u6765\u7684\u4eba\u7406\u89e3\u5b83\u3002',
  storyPlaceholder:
    '\u53ef\u4ee5\u5199\u5149\u7ebf\u3001\u58f0\u97f3\u3001\u90bb\u91cc\u3001\u8def\u7ebf\u3001\u72ec\u5904\u6216\u540c\u4f4f\u65f6\u7684\u771f\u5b9e\u611f\u53d7\u3002',
  photoTitle: '\u7167\u7247',
  photoSubtitle:
    '\u81f3\u5c11\u4e0a\u4f20 1 \u5f20\uff0c\u7b2c\u4e00\u5f20\u4f1a\u6210\u4e3a\u5c4b\u6a90\u6545\u4e8b\u5c01\u9762\u3002\u907f\u514d\u516c\u5f00\u95e8\u724c\u53f7\u3001\u5408\u540c\u53f7\u3001\u624b\u673a\u53f7\u7b49\u9690\u79c1\u4fe1\u606f\u3002',
  pledge: '\u540c\u610f\u5e76\u627f\u8bfa\u5185\u5bb9\u6765\u81ea\u771f\u5b9e\u5c45\u4f4f\u4f53\u9a8c',
  submit: '\u5199\u4e0b\u5c4b\u6a90\u8bb0',
  checkMark: '\u2713'
};

export default function SharePage() {
  const { profileStats, patchProfileStats } = useAuthStore();
  const [photos, setPhotos] = useState<string[]>([]);
  const [experience, setExperience] = useState('');
  const [truthPledge, setTruthPledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleExperienceInput(event: TextareaInputEvent) {
    setExperience(event.detail.value);
  }

  async function handleSubmit() {
    const validationError = validateShareExperienceDraft({ experience, photos, truthPledge });
    if (validationError) {
      void Taro.showToast({ title: validationError, icon: 'none' });
      return;
    }

    const trimmedExperience = experience.trim();
    setSubmitting(true);
    try {
      await createRental({
        title: trimmedExperience.slice(0, 28),
        experience: trimmedExperience,
        photos,
        truthPledge
      });

      void Taro.showToast({ title: TEXT.published, icon: 'success' });
      patchProfileStats({ publishCount: profileStats.publishCount + 1 });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (err) {
      const msg = err instanceof BizError ? err.message : TEXT.publishFailed;
      void Taro.showToast({ title: msg, icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <ScrollView scrollY showScrollbar={false} className="share-scroll">
        <FormSection title={TEXT.storyTitle} subtitle={TEXT.storySubtitle}>
          <Textarea
            className="share-textarea share-textarea--note"
            placeholder={TEXT.storyPlaceholder}
            placeholderClass="share-placeholder"
            value={experience}
            onInput={handleExperienceInput}
            maxlength={600}
            autoHeight
            showConfirmBar={false}
          />
          <Text className="share-text-count">{experience.length}/600</Text>
        </FormSection>

        <FormSection title={TEXT.photoTitle} subtitle={TEXT.photoSubtitle}>
          <PhotoUploader photos={photos} onChange={setPhotos} />
        </FormSection>

        <View className="share-pledge" onClick={() => setTruthPledge((value) => !value)}>
          <View className={`share-pledge__box${truthPledge ? ' share-pledge__box--checked' : ''}`}>
            <Text className="share-pledge__mark">{truthPledge ? TEXT.checkMark : ''}</Text>
          </View>
          <Text className="share-pledge__text">{TEXT.pledge}</Text>
        </View>
      </ScrollView>

      <SubmitBar text={TEXT.submit} loading={submitting} onSubmit={handleSubmit} />
    </PageShell>
  );
}
