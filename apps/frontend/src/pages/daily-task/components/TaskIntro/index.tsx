import type { DailyTaskDetail } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconCamera from '@/assets/icons/daily-task/icon-camera.png';
import iconClock from '@/assets/icons/daily-task/icon-clock.png';
import iconEvent from '@/assets/icons/daily-task/icon-event.png';
import iconMeasure from '@/assets/icons/daily-task/icon-measure.png';

import './index.scss';

/** 任务揭晓区参数。 */
interface TaskIntroProps {
  task: DailyTaskDetail;
}

/** 不同任务类型对应的 Pencil 切图。 */
const TASK_ICONS = {
  TIMED_OBSERVATION: iconClock,
  PHOTO_EVIDENCE: iconCamera,
  QUICK_MEASUREMENT: iconMeasure,
  DAILY_EVENT: iconEvent
} as const;

/** 六个空间的用户侧名称。 */
const MODULE_LABELS = {
  kitchen: '厨房',
  bathroom: '卫生间',
  living: '客厅',
  bedroom: '卧室',
  hallway: '玄关与过道',
  neighborhood: '小区周边'
} as const;

/** 展示今天随机揭晓的观察目标与选择原因。 */
export function TaskIntro({ task }: TaskIntroProps) {
  return (
    <View className="daily-task-intro">
      <View className="daily-task-intro__topline">
        <Image src={TASK_ICONS[task.type]} className="daily-task-intro__icon" mode="aspectFit" />
        <Text className="daily-task-intro__space">{MODULE_LABELS[task.module]}</Text>
      </View>
      <Text className="daily-task-intro__title">{task.title}</Text>
      <Text className="daily-task-intro__prompt">{task.prompt}</Text>
      <View className="daily-task-intro__reason">
        <Text>{task.explanation}</Text>
      </View>
    </View>
  );
}
