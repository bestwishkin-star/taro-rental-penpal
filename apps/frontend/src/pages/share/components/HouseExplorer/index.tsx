import { View } from '@tarojs/components';

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

/** 编辑态包装层，仅负责补充点位气泡。 */
export function HouseExplorer({
  modules,
  selectedId,
  completion,
  onSelect,
  onDismiss,
  onSupplement
}: HouseExplorerProps) {
  const selectedModule = modules.find((module) => module.id === selectedId) ?? null;

  return (
    <View className="share-house-explorer">
      <SharedHouseExplorer
        mode="edit"
        modules={modules}
        selectedId={selectedId}
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
