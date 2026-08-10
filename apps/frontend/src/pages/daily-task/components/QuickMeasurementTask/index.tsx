import type { DailyTaskDetail } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconMeasure from '@/assets/icons/daily-task/icon-measure.png';

import type { DailyTaskDraft } from '../../task-form-state';
import { TaskQuestionFields } from '../TaskQuestionFields';

import './index.scss';

/** 快速测量任务参数。 */
interface QuickMeasurementTaskProps {
  task: DailyTaskDetail;
  draft: DailyTaskDraft;
  onChange: (draft: DailyTaskDraft) => void;
}

/** 用单一大数值输入承载快速测量任务。 */
export function QuickMeasurementTask({
  task,
  draft,
  onChange
}: QuickMeasurementTaskProps) {
  return (
    <View className="daily-task-measurement">
      <View className="daily-task-measurement__heading">
        <Image src={iconMeasure} className="daily-task-measurement__icon" mode="aspectFit" />
        <View className="daily-task-measurement__copy">
          <Text className="daily-task-measurement__title">记下实际测量</Text>
          <Text className="daily-task-measurement__hint">以最窄处或真实等待时间为准</Text>
        </View>
      </View>
      <TaskQuestionFields task={task} draft={draft} onChange={onChange} />
    </View>
  );
}
