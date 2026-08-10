import type { DailyTaskVisibility } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconPrivate from '@/assets/icons/daily-task/icon-private.png';
import iconPublic from '@/assets/icons/daily-task/icon-public.png';

import type { DailyTaskDraft } from '../../task-form-state';

import './index.scss';

/** 结论和照片公开范围控件参数。 */
interface TaskVisibilityControlProps {
  draft: DailyTaskDraft;
  showPhotoVisibility: boolean;
  onChange: (draft: DailyTaskDraft) => void;
}

/** 单个公开范围分段控件参数。 */
interface VisibilitySegmentProps {
  value: DailyTaskVisibility;
  onChange: (value: DailyTaskVisibility) => void;
}

/** 使用 Pencil 图标渲染公开/私密二选一分段控件。 */
function VisibilitySegment({ value, onChange }: VisibilitySegmentProps) {
  return (
    <View className="daily-task-visibility__segment">
      <View
        className={`daily-task-visibility__option${value === 'PRIVATE' ? ' daily-task-visibility__option--selected' : ''}`}
        onClick={() => onChange('PRIVATE')}
      >
        <Image src={iconPrivate} className="daily-task-visibility__icon" mode="aspectFit" />
        <Text>仅自己可见</Text>
      </View>
      <View
        className={`daily-task-visibility__option${value === 'PUBLIC' ? ' daily-task-visibility__option--selected' : ''}`}
        onClick={() => onChange('PUBLIC')}
      >
        <Image src={iconPublic} className="daily-task-visibility__icon" mode="aspectFit" />
        <Text>公开到实录</Text>
      </View>
    </View>
  );
}

/** 独立控制结构化结论和现场照片的公开范围。 */
export function TaskVisibilityControl({
  draft,
  showPhotoVisibility,
  onChange
}: TaskVisibilityControlProps) {
  return (
    <View className="daily-task-visibility">
      <View className="daily-task-visibility__group">
        <Text className="daily-task-visibility__title">这次观察结论</Text>
        <VisibilitySegment
          value={draft.conclusionVisibility}
          onChange={(conclusionVisibility) => onChange({ ...draft, conclusionVisibility })}
        />
      </View>
      {showPhotoVisibility && (
        <View className="daily-task-visibility__group">
          <Text className="daily-task-visibility__title">现场照片</Text>
          <VisibilitySegment
            value={draft.photoVisibility}
            onChange={(photoVisibility) => onChange({ ...draft, photoVisibility })}
          />
        </View>
      )}
    </View>
  );
}
