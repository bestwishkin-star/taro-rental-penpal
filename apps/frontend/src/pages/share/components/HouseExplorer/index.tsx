import { HOUSE_MODULE_IDS } from '@shared/contracts/rental-space';
import { Text, View } from '@tarojs/components';
import { useDidShow, useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { fetchOwnerSpaceFacts } from '@/shared/api/daily-task';
import { ensureRentalDraft } from '@/shared/api/rental-space';
import {
  HouseExplorer as SharedHouseExplorer,
  type HouseModule,
  type HouseModuleId
} from '@/shared/ui/house-explorer';

import { PointPromptBubble } from './PointPromptBubble';

import './index.scss';

export type { HouseModule, HouseModuleId } from '@/shared/ui/house-explorer';

/** 分享页编辑态房屋场景属性。 */
interface HouseExplorerProps {
  modules: HouseModule[];
  selectedId: HouseModuleId | null;
  completion: number;
  onSelect: (id: HouseModuleId) => void;
  onDismiss: () => void;
  onSupplement: (id: HouseModuleId) => void;
}

/** 六空间新鲜度面板使用的短名称。 */
const MODULE_LABELS: Record<HouseModuleId, string> = {
  kitchen: '厨房',
  bathroom: '卫生间',
  living: '客厅',
  bedroom: '卧室',
  hallway: '楼道',
  neighborhood: '周边'
};

/** 判断路由参数是否属于六个固定空间。 */
function isHouseModuleId(value?: string): value is HouseModuleId {
  return Boolean(value && HOUSE_MODULE_IDS.includes(value as HouseModuleId));
}

/** 编辑态包装层，负责补充气泡、房主事实新鲜度和一次性空间高亮。 */
export function HouseExplorer({
  modules,
  selectedId,
  completion,
  onSelect,
  onDismiss,
  onSupplement
}: HouseExplorerProps) {
  const router = useRouter();
  const updatedModuleParam = router.params.updatedModule;
  const routeUpdatedModule: HouseModuleId | null = isHouseModuleId(updatedModuleParam)
    ? updatedModuleParam
    : null;
  const [highlightedId, setHighlightedId] = useState<HouseModuleId | null>(routeUpdatedModule);
  const [freshness, setFreshness] = useState<Partial<Record<HouseModuleId, number>>>({});
  const selectedModule = modules.find((module) => module.id === selectedId) ?? null;

  useDidShow(() => {
    // 房主每次回到模型页都读取 owner heads，公开模型不复用该数据。
    void ensureRentalDraft()
      .then((draft) => {
        if (!draft.publishedRentalId) return [];
        return fetchOwnerSpaceFacts(draft.publishedRentalId);
      })
      .then((summaries) => {
        const nextFreshness: Partial<Record<HouseModuleId, number>> = {};
        summaries.forEach((summary) => {
          nextFreshness[summary.module] = summary.freshnessPercent;
        });
        setFreshness(nextFreshness);
      })
      .catch(() => setFreshness({}));
  });

  useEffect(() => {
    if (!highlightedId) return undefined;
    const timer = setTimeout(() => setHighlightedId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  const freshnessItems = useMemo(
    () => HOUSE_MODULE_IDS.map((module) => ({ module, value: freshness[module] ?? 0 })),
    [freshness]
  );

  return (
    <View className="share-house-explorer">
      <SharedHouseExplorer
        mode="edit"
        modules={modules}
        selectedId={selectedId ?? highlightedId}
        completion={completion}
        onSelect={onSelect}
      />
      <View className="share-house-explorer__freshness">
        {freshnessItems.map((item) => (
          <View key={item.module} className="share-house-explorer__freshness-item">
            <View className="share-house-explorer__freshness-copy">
              <Text>{MODULE_LABELS[item.module]}</Text>
              <Text>{item.value}%</Text>
            </View>
            <View className="share-house-explorer__freshness-track">
              <View
                className="share-house-explorer__freshness-value"
                style={{ width: `${item.value}%` }}
              />
            </View>
          </View>
        ))}
      </View>
      {selectedModule && (
        <PointPromptBubble
          module={selectedModule}
          onClose={onDismiss}
          onSupplement={() => onSupplement(selectedModule.id)}
        />
      )}
    </View>
  );
}
