import { Text, View } from '@tarojs/components';

import './index.scss';

/** 四步记录流程的固定标题。 */
const STEPS = ['拍下此刻', '还原日常', '具体经历', '空间切片'];

/** 步骤进度组件参数，current 从零开始。 */
interface StepProgressProps {
  current: number;
}

/** 使用稳定四列布局展示当前和已完成步骤。 */
export function StepProgress({ current }: StepProgressProps) {
  return (
    <View className="step-progress">
      {STEPS.map((label, index) => (
        <View className={`step-progress__item ${index <= current ? 'step-progress__item--active' : ''}`} key={label}>
          <View className="step-progress__dot" />
          <Text className="step-progress__label">{label}</Text>
        </View>
      ))}
    </View>
  );
}
