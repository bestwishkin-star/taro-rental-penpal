import type { DailyTaskTodayResponse } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import iconSuccess from '@/assets/icons/daily-task/icon-success.png';
import iconArrow from '@/assets/icons/home-v2/icon-arrow-primary.png';
import iconClock from '@/assets/icons/home-v2/icon-clock.png';
import iconSpark from '@/assets/icons/home-v2/icon-spark.png';

import './index.scss';

/** 首页今日观察入口的完整可见状态。 */
export type DailyObservationEntryState =
  | { status: 'LOGGED_OUT' | 'LOADING' | 'NO_RENTAL' | 'ERROR' }
  | { status: 'READY'; rentalId: string; dailyTask: DailyTaskTodayResponse };

/** 首页今日观察入口参数。 */
interface DailyObservationEntryProps {
  state: DailyObservationEntryState;
  onRetry: () => void;
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

/** 每类观察任务在首页使用的短主题名称。 */
const TASK_TYPE_LABELS = {
  TIMED_OBSERVATION: '空气与感受',
  PHOTO_EVIDENCE: '现场一刻',
  QUICK_MEASUREMENT: '即时测量',
  DAILY_EVENT: '日常事件'
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

/** 首页今日观察入口，始终展示当前加载、引导或任务状态。 */
export function DailyObservationEntry({ state, onRetry }: DailyObservationEntryProps) {
  if (state.status !== 'READY') {
    const stateCopy = {
      LOGGED_OUT: {
        title: '登录后领取今日观察',
        summary: '每天从真实居住细节里，随机挑一件值得留意的小事',
        action: '去登录',
        meta: '登录后生成'
      },
      LOADING: {
        title: '正在抽取今天的观察',
        summary: '从你的房屋近况里挑选一件合适的小任务',
        action: '',
        meta: '请稍候'
      },
      NO_RENTAL: {
        title: '先留下你的房屋实录',
        summary: '公开一份完整记录后，每天都会收到一件随机观察',
        action: '去记录',
        meta: '约 3 分钟'
      },
      ERROR: {
        title: '今日观察没有加载出来',
        summary: '房屋记录仍在，重新加载即可继续',
        action: '重试',
        meta: '重新获取'
      }
    } as const;
    const copy = stateCopy[state.status];

    /** 根据入口状态执行登录、记录或重试命令。 */
    function handleStateAction() {
      if (state.status === 'LOGGED_OUT') {
        void Taro.switchTab({ url: '/pages/profile/index' });
        return;
      }
      if (state.status === 'NO_RENTAL') {
        void Taro.navigateTo({ url: '/pages/share/index' });
        return;
      }
      if (state.status === 'ERROR') onRetry();
    }

    return (
      <View
        className={`daily-observation-entry daily-observation-entry--state daily-observation-entry--${state.status.toLowerCase()}`}
      >
        <View className="daily-observation-entry__header">
          <View className="daily-observation-entry__category">
            <Image src={iconSpark} className="daily-observation-entry__category-icon" mode="aspectFit" />
            <Text className="daily-observation-entry__eyebrow">今日观察</Text>
          </View>
          <View className="daily-observation-entry__duration">
            <Image src={iconClock} className="daily-observation-entry__clock" mode="aspectFit" />
            <Text>{copy.meta}</Text>
          </View>
        </View>
        <View className="daily-observation-entry__copy">
          <Text className="daily-observation-entry__space">居住体验 · 今日一问</Text>
          <Text className="daily-observation-entry__title">{copy.title}</Text>
          <Text className="daily-observation-entry__summary">{copy.summary}</Text>
        </View>
        <View className="daily-observation-entry__footer">
          <Text className="daily-observation-entry__streak">每天一点，慢慢接近真实</Text>
          {copy.action && (
            <View
              className="daily-observation-entry__action-button"
              hoverClass="daily-observation-entry__action-button--active"
              onClick={handleStateAction}
            >
              <Text>{copy.action}</Text>
              <Image src={iconArrow} className="daily-observation-entry__action-arrow" mode="aspectFit" />
            </View>
          )}
        </View>
      </View>
    );
  }

  const { rentalId, dailyTask } = state;
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
        <View className="daily-observation-entry__header">
          <View className="daily-observation-entry__category">
            <Image src={iconSuccess} className="daily-observation-entry__category-icon" mode="aspectFit" />
            <Text className="daily-observation-entry__eyebrow">今日观察</Text>
          </View>
          <Text className="daily-observation-entry__duration">今日已完成</Text>
        </View>
        <View className="daily-observation-entry__copy">
          <Text className="daily-observation-entry__space">真实居住 · 持续记录</Text>
          <Text className="daily-observation-entry__title">今天的生活细节已留下</Text>
          <Text className="daily-observation-entry__summary">这次观察已经同步到你的房屋实录。</Text>
        </View>
        <View className="daily-observation-entry__footer">
          <Text className="daily-observation-entry__streak">已连续观察 {activeDays} 天</Text>
          <View className="daily-observation-entry__action-button">
            <Text>看房屋</Text>
            <Image src={iconArrow} className="daily-observation-entry__action-arrow" mode="aspectFit" />
          </View>
        </View>
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
          <Image src={iconSpark} className="daily-observation-entry__category-icon" mode="aspectFit" />
          <Text className="daily-observation-entry__eyebrow">今日观察</Text>
        </View>
        <View className="daily-observation-entry__duration">
          <Image src={iconClock} className="daily-observation-entry__clock" mode="aspectFit" />
          <Text>{formatDuration(task.estimatedSeconds)}</Text>
        </View>
      </View>

      <View className="daily-observation-entry__copy">
        <Text className="daily-observation-entry__space">
          {SPACE_LABELS[task.module]} · {TASK_TYPE_LABELS[task.type]}
        </Text>
        <Text className="daily-observation-entry__title">{task.title}</Text>
        <Text className="daily-observation-entry__summary">{task.prompt}</Text>
      </View>

      <View className="daily-observation-entry__footer">
        <Text className="daily-observation-entry__streak">已连续观察 {activeDays} 天 · {formatExpiry(task.expiresAt)}</Text>
        <View className="daily-observation-entry__action-button">
          <Text>开始观察</Text>
          <Image src={iconArrow} className="daily-observation-entry__action-arrow" mode="aspectFit" />
        </View>
      </View>
    </View>
  );
}
