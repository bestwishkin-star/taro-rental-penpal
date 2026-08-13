import { View } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { useEffect, useState } from 'react';

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

/** 前端本地运行时点位枚举，避免 Taro 直接加载工作区外未转译的 TypeScript。 */
const HOUSE_MODULE_IDS: readonly HouseModuleId[] = [
  'kitchen',
  'bathroom',
  'living',
  'bedroom',
  'hallway',
  'neighborhood'
];

/** 判断路由参数是否属于六个固定空间。 */
function isHouseModuleId(value?: string): value is HouseModuleId {
  return Boolean(value && HOUSE_MODULE_IDS.includes(value as HouseModuleId));
}

/** 编辑态包装层，负责补充气泡和任务完成后的一次性空间高亮。 */
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
  const selectedModule = modules.find((module) => module.id === selectedId) ?? null;

  useEffect(() => {
    if (!highlightedId) return undefined;
    const timer = setTimeout(() => setHighlightedId(null), 1800);
    return () => clearTimeout(timer);
  }, [highlightedId]);

  return (
    <View className="share-house-explorer">
      <SharedHouseExplorer
        mode="edit"
        modules={modules}
        selectedId={selectedId ?? highlightedId}
        completion={completion}
        onSelect={onSelect}
      />
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
