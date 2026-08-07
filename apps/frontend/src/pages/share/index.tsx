import type { HouseRecordSnapshotStatus } from '@shared/contracts/house-record';
import type { RentalDraftSummary } from '@shared/contracts/rental-space';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useEffect, useState } from 'react';

import {
  fetchHouseRecordSnapshotStatus,
  publishHouseRecordSnapshot
} from '@/shared/api/house-record';
import { ensureRentalDraft, publishRentalDraft } from '@/shared/api/rental-space';
import { AppLayout } from '@/shared/ui/app-layout';

import { HouseExplorer, type HouseModule, type HouseModuleId } from './components/HouseExplorer';
import { PublishSnapshotAction } from './components/PublishSnapshotAction';
import { PublishStoryAction } from './components/PublishStoryAction';
import { RENTAL_DRAFT_UPDATED_EVENT } from './events';

import './index.scss';

/** 三维房屋固定展示的六个点位及其引导文案。 */
const HOUSE_MODULES: HouseModule[] = [
  { id: 'kitchen', label: '厨房', prompt: '记录油烟、台面、燃气、收纳和清洁状态。', completed: false },
  { id: 'bathroom', label: '厕所', prompt: '记录通风、排水、热水、异味和干湿分离。', completed: false },
  { id: 'living', label: '客厅', prompt: '记录采光、噪音、公共空间和同住动线。', completed: false },
  { id: 'bedroom', label: '房间', prompt: '记录朝向、隔音、储物、床位和私密感。', completed: false },
  { id: 'hallway', label: '楼道', prompt: '记录电梯、门禁、楼道卫生和夜间安全感。', completed: false },
  { id: 'neighborhood', label: '周边环境', prompt: '记录地铁、菜场、夜路、外卖和生活便利度。', completed: false }
];

/** 页面标题文案，点位状态由服务端草稿动态补充。 */
const TEXT = {
  title: '写下一方屋檐下',
  subtitle: '从房屋结构开始记录真实居住体验，让后来者先看到整体，再走进每个关键角落。'
};

/** 三维房屋空间记录入口，负责草稿编辑、首次发布和日常实录更新。 */
export default function SharePage() {
  const [selectedModuleId, setSelectedModuleId] = useState<HouseModuleId | null>(null);
  const [draft, setDraft] = useState<RentalDraftSummary | null>(null);
  const [snapshotStatus, setSnapshotStatus] = useState<HouseRecordSnapshotStatus | null>(null);
  const [openingModule, setOpeningModule] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [updatingSnapshot, setUpdatingSnapshot] = useState(false);

  useEffect(() => {
    /** 点位保存后即时更新模型，并将已发布修订标记为待同步。 */
    function handleDraftUpdated(nextDraft: RentalDraftSummary) {
      setDraft(nextDraft);
      if (nextDraft.publishedRentalId) {
        setSnapshotStatus((current) =>
          current
            ? {
                ...current,
                currentUpdatedAt: nextDraft.updatedAt,
                hasUnpublishedChanges: true
              }
            : {
                currentUpdatedAt: nextDraft.updatedAt,
                hasUnpublishedChanges: true
              }
        );
      }
    }

    Taro.eventCenter.on(RENTAL_DRAFT_UPDATED_EVENT, handleDraftUpdated);
    return () => Taro.eventCenter.off(RENTAL_DRAFT_UPDATED_EVENT, handleDraftUpdated);
  }, []);

  useDidShow(() => {
    // 返回页面时同时校准草稿完整度和公开快照同步状态。
    void ensureRentalDraft()
      .then(async (nextDraft) => {
        setDraft(nextDraft);
        if (!nextDraft.publishedRentalId) {
          setSnapshotStatus(null);
          return;
        }
        const status = await fetchHouseRecordSnapshotStatus(nextDraft.publishedRentalId);
        setSnapshotStatus(status);
      })
      .catch((error) =>
        Taro.showToast({
          title: error instanceof Error ? error.message : '草稿加载失败',
          icon: 'none'
        })
      );
  });

  /** 等待草稿就绪后进入指定点位，并防止连续点击重复打开页面。 */
  async function handleSupplementModule(moduleId: HouseModuleId) {
    if (openingModule) return;
    try {
      setOpeningModule(true);
      const currentDraft = draft ?? (await ensureRentalDraft());
      if (!draft) setDraft(currentDraft);
      setSelectedModuleId(null);
      await Taro.navigateTo({
        url: `/pages/share/point/index?draftId=${currentDraft.id}&module=${moduleId}`
      });
    } catch (error) {
      void Taro.showToast({
        title: error instanceof Error ? error.message : '空间记录打开失败',
        icon: 'none'
      });
    } finally {
      setOpeningModule(false);
    }
  }

  /** 将首次完成的六空间草稿发布为房屋实录。 */
  async function handlePublish() {
    if (!draft || publishing) return;
    try {
      setPublishing(true);
      const result = await publishRentalDraft(draft.id);
      void Taro.showToast({ title: '房屋实录已发布', icon: 'success' });
      setTimeout(() => {
        void Taro.redirectTo({ url: `/pages/rental-detail/index?id=${result.rentalId}` });
      }, 500);
    } catch (error) {
      void Taro.showToast({
        title: error instanceof Error ? error.message : '发布失败',
        icon: 'none'
      });
    } finally {
      setPublishing(false);
    }
  }

  /** 确认后将修订草稿覆盖到当天公开快照。 */
  async function handleUpdateSnapshot() {
    if (!draft?.publishedRentalId || updatingSnapshot) return;
    const modal = await Taro.showModal({
      title: '更新今天的房屋实录',
      content: '今天已有记录时会覆盖当天版本，过去日期不会改变。',
      confirmText: '确认更新'
    });
    if (!modal.confirm) return;

    try {
      setUpdatingSnapshot(true);
      await publishHouseRecordSnapshot(draft.publishedRentalId);
      const status = await fetchHouseRecordSnapshotStatus(draft.publishedRentalId);
      setSnapshotStatus(status);
      void Taro.showToast({ title: '今天的实录已更新', icon: 'success' });
    } catch (error) {
      void Taro.showToast({
        title: error instanceof Error ? error.message : '更新失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      setUpdatingSnapshot(false);
    }
  }

  // 完成状态来自服务端，前端只负责映射给 Three.js 场景。
  const modules = HOUSE_MODULES.map((module) => ({
    ...module,
    completed: draft?.completedModules.includes(module.id) ?? false
  }));

  return (
    <AppLayout mode="native" contentClassName="share-page-shell">
      <View className="share-hero">
        <Text className="share-hero__title">{TEXT.title}</Text>
        <Text className="share-hero__subtitle">{TEXT.subtitle}</Text>
      </View>

      <HouseExplorer
        modules={modules}
        selectedId={selectedModuleId}
        completion={draft?.completion ?? 0}
        onSelect={setSelectedModuleId}
        onDismiss={() => setSelectedModuleId(null)}
        onSupplement={handleSupplementModule}
      />

      {draft?.publishedRentalId ? (
        <PublishSnapshotAction
          hasUnpublishedChanges={snapshotStatus?.hasUnpublishedChanges ?? false}
          completion={draft.completion}
          busy={updatingSnapshot}
          onPublish={() => void handleUpdateSnapshot()}
        />
      ) : (
        <PublishStoryAction
          completion={draft?.completion ?? 0}
          busy={publishing}
          onPublish={() => void handlePublish()}
        />
      )}
    </AppLayout>
  );
}
