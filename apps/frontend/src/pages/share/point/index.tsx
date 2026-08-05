import type {
  EvidenceVisibility,
  HouseModuleId,
  PhotoCaptureChallenge,
  RentalEventPeriod,
  SpaceRecordPhoto,
  SpaceRecordResponse,
  SpaceSceneAnswer
} from '@shared/contracts/rental-space';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import {
  attachSpacePhoto,
  createCaptureChallenge,
  deleteSpacePhoto,
  ensureRentalDraft,
  fetchSpaceRecord,
  saveSpaceRecord,
  updateSpacePhoto,
  uploadPhotoAsset
} from '@/shared/api/rental-space';
import { AppLayout } from '@/shared/ui/app-layout';

import { CaptureStep } from './components/CaptureStep';
import { DailySceneStep } from './components/DailySceneStep';
import { EventStoryStep } from './components/EventStoryStep';
import { SpaceSlicePreview } from './components/SpaceSlicePreview';
import { StepProgress } from './components/StepProgress';
import { RENTAL_DRAFT_UPDATED_EVENT } from '../events';

import './index.scss';

/** 前端本地运行时点位枚举，避免 Taro 分包加载未转译的工作区 TypeScript。 */
const HOUSE_MODULE_IDS: HouseModuleId[] = [
  'kitchen',
  'bathroom',
  'living',
  'bedroom',
  'hallway',
  'neighborhood'
];

/** 点位 ID 对应的用户可读中文名称。 */
const MODULE_LABELS: Record<HouseModuleId, string> = {
  kitchen: '厨房',
  bathroom: '厕所',
  living: '客厅',
  bedroom: '房间',
  hallway: '楼道',
  neighborhood: '周边环境'
};

/** 将路由参数收敛为允许的六个点位。 */
function readModule(value?: string): HouseModuleId | null {
  return value && HOUSE_MODULE_IDS.includes(value as HouseModuleId) ? (value as HouseModuleId) : null;
}

/** 四步沉浸式空间记录页，负责加载、拍摄、自动保存和切片确认。 */
export default function SharePointPage() {
  const params = Taro.getCurrentInstance().router?.params ?? {};
  const module = readModule(params.module);
  const [draftId, setDraftId] = useState(params.draftId ?? '');
  const [data, setData] = useState<SpaceRecordResponse | null>(null);
  const [challenge, setChallenge] = useState<PhotoCaptureChallenge | null>(null);
  const [step, setStep] = useState(0);
  const [visibility, setVisibility] = useState<EvidenceVisibility>('VERIFICATION_ONLY');
  const [answers, setAnswers] = useState<SpaceSceneAnswer[]>([]);
  const [eventText, setEventText] = useState('');
  const [eventPeriod, setEventPeriod] = useState<RentalEventPeriod>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /** 使用服务端最新响应统一刷新页面编辑状态。 */
  function applyResponse(response: SpaceRecordResponse) {
    setData(response);
    setAnswers(response.record.sceneAnswers);
    setEventText(response.record.eventText ?? '');
    setEventPeriod(response.record.eventOccurredPeriod);
  }

  /** 当前挑战使用或失效后，申请下一次随机拍摄任务。 */
  async function renewCaptureChallenge() {
    if (!module || !draftId) return;
    try {
      setChallenge(await createCaptureChallenge(draftId, module));
    } catch {
      setChallenge(null);
    }
  }

  useEffect(() => {
    if (!module) {
      setError('无法识别这个空间点位');
      return;
    }

    async function load() {
      try {
        setBusy(true);
        const resolvedDraftId = draftId || (await ensureRentalDraft()).id;
        if (!draftId) setDraftId(resolvedDraftId);
        const resolvedModule = module as HouseModuleId;
        // 点位内容和拍摄挑战相互独立，并行获取以缩短首屏等待。
        const [record, nextChallenge] = await Promise.all([
          fetchSpaceRecord(resolvedDraftId, resolvedModule),
          createCaptureChallenge(resolvedDraftId, resolvedModule)
        ]);
        applyResponse(record);
        setChallenge(nextChallenge);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : '空间记录加载失败');
      } finally {
        setBusy(false);
      }
    }

    void load();
  }, [draftId, module]);

  /** 打开相机、上传图片资产并消费当前一次性拍摄挑战。 */
  async function handleCapture() {
    if (!module || !draftId || !challenge || busy) return;
    try {
      const media = await Taro.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['camera'] });
      const filePath = media.tempFiles[0]?.tempFilePath;
      if (!filePath) return;
      setBusy(true);
      const asset = await uploadPhotoAsset(filePath);
      const response = await attachSpacePhoto(draftId, module, {
        assetId: asset.assetId,
        visibility,
        captureChallengeId: challenge.id,
        capturedAt: new Date().toISOString()
      });
      applyResponse(response);
      await renewCaptureChallenge();
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : '照片保存失败';
      if (!message.includes('cancel')) void Taro.showToast({ title: message, icon: 'none' });
      if (!message.includes('cancel')) await renewCaptureChallenge();
    } finally {
      setBusy(false);
    }
  }

  /** 切换已上传照片的公开或仅核验状态。 */
  async function handlePhotoVisibility(photo: SpaceRecordPhoto, nextVisibility: EvidenceVisibility) {
    if (!module || !draftId || busy) return;
    try {
      setBusy(true);
      applyResponse(await updateSpacePhoto(draftId, module, photo.id, { visibility: nextVisibility }));
    } catch (updateError) {
      void Taro.showToast({ title: updateError instanceof Error ? updateError.message : '修改失败', icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 用户确认后删除照片，并使用服务端响应刷新完成度。 */
  async function handleDeletePhoto(photo: SpaceRecordPhoto) {
    if (!module || !draftId || busy) return;
    const modal = await Taro.showModal({ title: '删除这张照片？', content: '删除后需要重新拍摄才能完成此空间。' });
    if (!modal.confirm) return;
    try {
      setBusy(true);
      applyResponse(await deleteSpacePhoto(draftId, module, photo.id));
    } catch (deleteError) {
      void Taro.showToast({ title: deleteError instanceof Error ? deleteError.message : '删除失败', icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 统一执行点位 PATCH 保存并处理加载态和错误提示。 */
  async function saveProgress(input: Parameters<typeof saveSpaceRecord>[2]) {
    if (!module || !draftId) return null;
    try {
      setBusy(true);
      const response = await saveSpaceRecord(draftId, module, input);
      applyResponse(response);
      return response;
    } catch (saveError) {
      void Taro.showToast({ title: saveError instanceof Error ? saveError.message : '保存失败', icon: 'none' });
      return null;
    } finally {
      setBusy(false);
    }
  }

  /** 保存至少三项日常场景回答后进入具体经历步骤。 */
  async function handleSaveScenes() {
    if (!data || answers.length < 3 || busy) return;
    const response = await saveProgress({ promptVersion: data.config.promptVersion, sceneAnswers: answers });
    if (response) setStep(2);
  }

  /** 保存发生时段和不少于二十字的具体居住经历。 */
  async function handleSaveEvent() {
    if (!data || !eventPeriod || eventText.trim().length < 20 || busy) return;
    const response = await saveProgress({
      promptVersion: data.config.promptVersion,
      eventText,
      eventOccurredPeriod: eventPeriod
    });
    if (response) setStep(3);
  }

  /** 确认空间切片并返回三维房屋点亮对应点位。 */
  async function handleConfirm() {
    if (!data || busy) return;
    const response = await saveProgress({ promptVersion: data.config.promptVersion, isSliceConfirmed: true });
    if (!response) return;
    Taro.eventCenter.trigger(RENTAL_DRAFT_UPDATED_EVENT, response.draft);
    void Taro.showToast({ title: `${MODULE_LABELS[data.record.module]}已点亮`, icon: 'success' });
    setTimeout(() => void Taro.navigateBack(), 500);
  }

  if (error) {
    return (
      <AppLayout mode="native" contentClassName="share-point-page">
        <View className="share-point-page__message"><Text>{error}</Text></View>
      </AppLayout>
    );
  }

  if (!data || !module) {
    return (
      <AppLayout mode="native" contentClassName="share-point-page">
        <View className="share-point-page__message"><Text>正在打开空间记录</Text></View>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="native" contentClassName="share-point-page">
      <View className="share-point-page__header">
        <Text className="share-point-page__module">{MODULE_LABELS[module]}</Text>
        <Text className="share-point-page__completion">房屋完整度 {data.draft.completion}%</Text>
      </View>
      <StepProgress current={step} />
      <View className="share-point-page__task">
        {step === 0 && (
          <CaptureStep
            capturePrompt={challenge?.prompt ?? data.config.capturePrompt}
            photos={data.record.photos}
            visibility={visibility}
            busy={busy}
            onVisibilityChange={setVisibility}
            onCapture={() => void handleCapture()}
            onPhotoVisibilityChange={(photo, value) => void handlePhotoVisibility(photo, value)}
            onDelete={(photo) => void handleDeletePhoto(photo)}
            onNext={() => data.record.photos.length > 0 && setStep(1)}
          />
        )}
        {step === 1 && (
          <DailySceneStep
            prompts={data.config.prompts}
            answers={answers}
            busy={busy}
            onChange={setAnswers}
            onBack={() => setStep(0)}
            onNext={() => void handleSaveScenes()}
          />
        )}
        {step === 2 && (
          <EventStoryStep
            prompt={data.config.eventPrompt}
            text={eventText}
            period={eventPeriod}
            busy={busy}
            onTextChange={setEventText}
            onPeriodChange={setEventPeriod}
            onBack={() => setStep(1)}
            onNext={() => void handleSaveEvent()}
          />
        )}
        {step === 3 && (
          <SpaceSlicePreview
            moduleLabel={MODULE_LABELS[module]}
            prompts={data.config.prompts}
            record={data.record}
            busy={busy}
            onBack={() => setStep(2)}
            onConfirm={() => void handleConfirm()}
          />
        )}
      </View>
    </AppLayout>
  );
}
