import type { DailyTaskDetail } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconEvent from '@/assets/icons/daily-task/icon-event.png';

import type { DailyTaskDraft } from '../../task-form-state';
import { TaskQuestionFields } from '../TaskQuestionFields';

import './index.scss';

/** 当日事件任务参数。 */
interface DailyEventTaskProps {
  task: DailyTaskDetail;
  draft: DailyTaskDraft;
  onChange: (draft: DailyTaskDraft) => void;
}

/** 以具体事件和结构化感受组合记录当日居住体验。 */
export function DailyEventTask({ task, draft, onChange }: DailyEventTaskProps) {
  return (
    <View className="daily-task-event">
      <View className="daily-task-event__heading">
        <Image src={iconEvent} className="daily-task-event__icon" mode="aspectFit" />
        <View className="daily-task-event__copy">
          <Text className="daily-task-event__title">回想今天的一个片段</Text>
          <Text className="daily-task-event__hint">写具体发生的事，不需要概括房屋好坏</Text>
        </View>
      </View>
      <TaskQuestionFields task={task} draft={draft} onChange={onChange} />
    </View>
  );
}
