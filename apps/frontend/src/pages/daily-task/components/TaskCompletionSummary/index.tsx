import type { CompleteDailyTaskResult } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconSuccess from '@/assets/icons/daily-task/icon-success.png';
import completeGlow from '@/assets/icons/daily-task/task-complete-glow.png';

import './index.scss';

/** 任务完成反馈参数。 */
interface TaskCompletionSummaryProps {
  result: CompleteDailyTaskResult;
  onViewHouse: () => void;
}

/** 六个空间的完成反馈名称。 */
const MODULE_LABELS = {
  kitchen: '厨房',
  bathroom: '卫生间',
  living: '客厅',
  bedroom: '卧室',
  hallway: '玄关与过道',
  neighborhood: '小区周边'
} as const;

/** 将公开投影状态转换为不夸大审核结果的用户文案。 */
function getProjectionCopy(status: CompleteDailyTaskResult['publicProjectionStatus']): string {
  if (status === 'PUBLISHED') return '这次观察已更新到公开实录';
  if (status === 'PENDING') return '观察已保存，公开内容正在核验';
  if (status === 'REJECTED') return '观察已保存，仅在自己的房屋中可见';
  return '这次观察只保存在自己的房屋中';
}

/** 展示空间新鲜度变化并引导查看更新后的房屋。 */
export function TaskCompletionSummary({ result, onViewHouse }: TaskCompletionSummaryProps) {
  return (
    <View className="daily-task-completion">
      <Image src={completeGlow} className="daily-task-completion__glow" mode="aspectFit" />
      <Image src={iconSuccess} className="daily-task-completion__icon" mode="aspectFit" />
      <Text className="daily-task-completion__eyebrow">今日观察已留下</Text>
      <Text className="daily-task-completion__title">
        {MODULE_LABELS[result.updatedModule]}亮起了一点
      </Text>
      <Text className="daily-task-completion__copy">{getProjectionCopy(result.publicProjectionStatus)}</Text>
      <View className="daily-task-completion__freshness">
        <Text className="daily-task-completion__freshness-value">{result.freshnessPercent}%</Text>
        <Text className="daily-task-completion__freshness-label">当前空间资料新鲜度</Text>
      </View>
      <View
        className="daily-task-completion__action"
        hoverClass="daily-task-completion__action--active"
        onClick={onViewHouse}
      >
        <Text>查看更新后的房屋</Text>
      </View>
    </View>
  );
}
