import { Text, View } from '@tarojs/components';

import './index.scss';

/** 首页问候区参数。 */
interface HomeGreetingProps {
  date: Date;
  topInset: number;
}

/** 中文星期名称。 */
const WEEKDAY_LABELS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const;

/** 首页轻量问候区，建立日期与持续记录的日常感。 */
export function HomeGreeting({ date, topInset }: HomeGreetingProps) {
  return (
    <View className="home-greeting" style={{ paddingTop: `${topInset + 12}px` }}>
      <Text className="home-greeting__eyebrow">
        {date.getMonth() + 1}月{date.getDate()}日 · {WEEKDAY_LABELS[date.getDay()]}
      </Text>
      <Text className="home-greeting__title">今天，也留下一点真实</Text>
    </View>
  );
}
