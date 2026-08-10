import type { DailyTaskTodayResponse } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import iconClock from '@/assets/icons/daily-task/icon-clock.png';
import iconEvent from '@/assets/icons/daily-task/icon-event.png';
import iconReplace from '@/assets/icons/daily-task/icon-replace.png';
import iconSuccess from '@/assets/icons/daily-task/icon-success.png';

import './index.scss';

interface DailyObservationEntryProps {
  rentalId: string;
  dailyTask: DailyTaskTodayResponse;
}

/** 六个固定观察空间对应的首页短文案。 */
const SPACE_LABELS = {
  kitchen: '厨房',
  bathroom: '卫生间',
  living: '客厅',
  bedroom: '卧室',
  hallway: '玄关与过道',
  neighborhood: '小区周边'
} as const;

/** 将服务端秒数转换为适合入口卡片展示的耗时。 */
function formatDuration(seconds: number) {
  if (seconds < 60) return `约 ${seconds} 秒`;
  return `约 ${Math.ceil(seconds / 60)} 分钟`;
}

/** 将绝对过期时间转换为上海当天的小时分钟。 */
function formatExpiry(expiresAt: string): string {
  const shanghaiTime = new Date(Date.parse(expiresAt) + 8 * 60 * 60 * 1000);
  const hour = String(shanghaiTime.getUTCHours()).padStart(2, '0');
  const minute = String(shanghaiTime.getUTCMinutes()).padStart(2, '0');
  return `${hour}:${minute} 前完成`;
}

/** 首页今日观察入口，按任务状态进入执行页或分享页。 */
export function DailyObservationEntry({ rentalId, dailyTask }: DailyObservationEntryProps) {
  const { task, completedToday, activeDays } = dailyTask;

  function handleClick() {
    const targetPage = completedToday ? '/pages/share/index' : '/pages/daily-task/index';
    void Taro.navigateTo({ url: `${targetPage}?rentalId=${encodeURIComponent(rentalId)}` });
  }

  if (completedToday) {
    return (
      <View
        className="daily-observation-entry daily-observation-entry--completed"
        hoverClass="daily-observation-entry--active"
        onClick={handleClick}
      >
        <Image
          src={iconSuccess}
          className="daily-observation-entry__success-icon"
          mode="aspectFit"
        />
        <View className="daily-observation-entry__completed-copy">
          <Text className="daily-observation-entry__eyebrow">今日观察</Text>
          <Text className="daily-observation-entry__title">今日观察已完成</Text>
          <Text className="daily-observation-entry__summary">已累计观察 {activeDays} 天</Text>
        </View>
        <Text className="daily-observation-entry__action">看房屋</Text>
      </View>
    );
  }

  if (!task) return null;

  return (
    <View
      className="daily-observation-entry"
      hoverClass="daily-observation-entry--active"
      onClick={handleClick}
    >
      <View className="daily-observation-entry__header">
        <View className="daily-observation-entry__category">
          <Image src={iconEvent} className="daily-observation-entry__category-icon" mode="aspectFit" />
          <Text className="daily-observation-entry__eyebrow">今日观察</Text>
        </View>
        <Text className="daily-observation-entry__space">{SPACE_LABELS[task.module]}</Text>
      </View>

      <Text className="daily-observation-entry__title">{task.title}</Text>

      <View className="daily-observation-entry__meta">
        <View className="daily-observation-entry__meta-item">
          <Image src={iconClock} className="daily-observation-entry__meta-icon" mode="aspectFit" />
          <Text>{formatDuration(task.estimatedSeconds)}</Text>
        </View>
        <View className="daily-observation-entry__meta-item">
          <Image src={iconReplace} className="daily-observation-entry__meta-icon" mode="aspectFit" />
          <Text>剩余更换 {task.remainingReplacements} 次</Text>
        </View>
        <View className="daily-observation-entry__meta-item">
          <Text>{formatExpiry(task.expiresAt)}</Text>
        </View>
      </View>

      <View className="daily-observation-entry__footer">
        <Text className="daily-observation-entry__summary">已累计观察 {activeDays} 天</Text>
        <Text className="daily-observation-entry__action">去观察</Text>
      </View>
    </View>
  );
}
