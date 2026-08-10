import type { DailyTaskDetail } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconClock from '@/assets/icons/daily-task/icon-clock.png';

import type { DailyTaskDraft } from '../../task-form-state';
import { TaskQuestionFields } from '../TaskQuestionFields';

import './index.scss';

/** 定时观察任务参数。 */
interface TimedObservationTaskProps {
  task: DailyTaskDetail;
  draft: DailyTaskDraft;
  elapsedSeconds: number;
  onChange: (draft: DailyTaskDraft) => void;
}

/** 根据服务端开始时间展示稳定计时进度和观察问题。 */
export function TimedObservationTask({
  task,
  draft,
  elapsedSeconds,
  onChange
}: TimedObservationTaskProps) {
  const targetSeconds = Math.max(1, task.estimatedSeconds);
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const progress = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

  return (
    <View className="daily-task-timed">
      <View className="daily-task-timed__timer">
        <Image src={iconClock} className="daily-task-timed__icon" mode="aspectFit" />
        <View className="daily-task-timed__timer-copy">
          <Text className="daily-task-timed__timer-label">
            {remainingSeconds > 0 ? '保持观察' : '观察时间已达到'}
          </Text>
          <Text className="daily-task-timed__time">
            {remainingSeconds > 0 ? `${remainingSeconds} 秒` : '可以记录感受'}
          </Text>
        </View>
      </View>
      <View className="daily-task-timed__track">
        <View className="daily-task-timed__progress" style={{ width: `${progress}%` }} />
      </View>
      <TaskQuestionFields task={task} draft={draft} onChange={onChange} />
    </View>
  );
}
