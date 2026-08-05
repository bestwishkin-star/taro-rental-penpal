import type { RentalEventPeriod } from '@shared/contracts/rental-space';
import { Text, Textarea, View } from '@tarojs/components';

import './index.scss';

/** 具体经历允许选择的四个模糊时段。 */
const PERIODS: Array<{ value: RentalEventPeriod; label: string }> = [
  { value: 'MORNING', label: '清晨' },
  { value: 'DAYTIME', label: '白天' },
  { value: 'EVENING', label: '晚上' },
  { value: 'LATE_NIGHT', label: '深夜' }
];

/** 具体居住事件步骤参数。 */
interface EventStoryStepProps {
  prompt: string;
  text: string;
  period?: RentalEventPeriod;
  busy: boolean;
  onTextChange: (value: string) => void;
  onPeriodChange: (value: RentalEventPeriod) => void;
  onBack: () => void;
  onNext: () => void;
}

/** 引导用户记录发生时段、事件、影响和应对方式。 */
export function EventStoryStep({
  prompt,
  text,
  period,
  busy,
  onTextChange,
  onPeriodChange,
  onBack,
  onNext
}: EventStoryStepProps) {
  return (
    <View className="event-story-step">
      <Text className="point-step__eyebrow">03 / 一件真事</Text>
      <Text className="point-step__title">讲一件具体发生过的事</Text>
      <Text className="point-step__prompt">{prompt}</Text>

      <Text className="event-story-step__label">发生在什么时候</Text>
      <View className="event-story-step__periods">
        {PERIODS.map((item) => (
          <View
            className={`event-story-step__period ${period === item.value ? 'event-story-step__period--active' : ''}`}
            key={item.value}
            onClick={() => onPeriodChange(item.value)}
          >
            <Text>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text className="event-story-step__label">事情、影响和你的应对</Text>
      <Textarea
        className="event-story-step__textarea"
        maxlength={800}
        value={text}
        placeholder="例如：上周深夜洗澡时热水突然变冷，我等了十分钟仍没恢复，后来联系房东重启了热水器……"
        onInput={(event) => onTextChange(event.detail.value)}
      />
      <Text className="event-story-step__count">{text.length} / 800</Text>

      <View className="point-step__actions">
        <View className="point-step__secondary" onClick={onBack}><Text>返回日常</Text></View>
        <View
          className={`point-step__primary point-step__primary--inline ${!period || text.trim().length < 20 || busy ? 'point-step__primary--disabled' : ''}`}
          onClick={onNext}
        >
          <Text>{busy ? '正在保存' : '生成空间切片'}</Text>
        </View>
      </View>
    </View>
  );
}
