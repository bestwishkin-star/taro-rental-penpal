import type { SpacePrompt, SpaceSceneAnswer } from '@shared/contracts/rental-space';
import { Text, View } from '@tarojs/components';

import './index.scss';

/** 日常场景步骤参数，答案由页面入口统一保存。 */
interface DailySceneStepProps {
  prompts: SpacePrompt[];
  answers: SpaceSceneAnswer[];
  busy: boolean;
  onChange: (answers: SpaceSceneAnswer[]) => void;
  onBack: () => void;
  onNext: () => void;
}

/** 将服务端题目配置渲染为轻量场景选择，不使用传统长表单。 */
export function DailySceneStep({ prompts, answers, busy, onChange, onBack, onNext }: DailySceneStepProps) {
  const answerMap = new Map(answers.map((answer) => [answer.promptId, answer.value]));

  /** 同一题目只保留最后一次选择。 */
  function choose(promptId: string, value: string) {
    onChange([...answers.filter((answer) => answer.promptId !== promptId), { promptId, value }]);
  }

  return (
    <View className="daily-scene-step">
      <Text className="point-step__eyebrow">02 / 日常观察</Text>
      <Text className="point-step__title">还原日常</Text>
      <Text className="point-step__prompt">选择最接近长期居住情况的描述，不需要给房子打分。</Text>

      {prompts.map((prompt) => (
        <View className="daily-scene-step__question" key={prompt.id}>
          <Text className="daily-scene-step__question-title">{prompt.title}</Text>
          <View className="daily-scene-step__options">
            {prompt.options.map((item) => (
              <View
                className={`daily-scene-step__option ${answerMap.get(prompt.id) === item.value ? 'daily-scene-step__option--active' : ''}`}
                key={item.value}
                onClick={() => choose(prompt.id, item.value)}
              >
                <Text>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View className="point-step__actions">
        <View className="point-step__secondary" onClick={onBack}><Text>返回照片</Text></View>
        <View
          className={`point-step__primary point-step__primary--inline ${answers.length < 3 || busy ? 'point-step__primary--disabled' : ''}`}
          onClick={onNext}
        >
          <Text>{busy ? '正在保存' : '继续讲经历'}</Text>
        </View>
      </View>
    </View>
  );
}
