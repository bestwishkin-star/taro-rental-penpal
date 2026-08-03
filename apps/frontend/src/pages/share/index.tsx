import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { PageShell } from '@/shared/ui/page-shell';

import { HouseExplorer, type HouseModule, type HouseModuleId } from './components/HouseExplorer';

import './index.scss';

const HOUSE_MODULES: HouseModule[] = [
  {
    id: 'kitchen',
    label: '厨房',
    prompt: '记录油烟、台面、燃气、收纳和清洁状态。',
    completed: false
  },
  {
    id: 'bathroom',
    label: '厕所',
    prompt: '记录通风、排水、热水、异味和干湿分离。',
    completed: false
  },
  {
    id: 'living',
    label: '客厅',
    prompt: '记录采光、噪音、公共空间和同住动线。',
    completed: false
  },
  {
    id: 'bedroom',
    label: '房间',
    prompt: '记录朝向、隔音、储物、床位和私密感。',
    completed: false
  },
  {
    id: 'hallway',
    label: '楼道',
    prompt: '记录电梯、门禁、楼道卫生和夜间安全感。',
    completed: false
  },
  {
    id: 'neighborhood',
    label: '周边环境',
    prompt: '记录地铁、菜场、夜路、外卖和生活便利度。',
    completed: false
  }
];

const TEXT = {
  title: '写下一方屋檐下',
  subtitle: '从房屋结构开始记录真实居住体验，让后来者先看到整体，再走进每个关键角落。',
  modulePending: '详情页正在准备中'
};

export default function SharePage() {
  const [selectedModuleId, setSelectedModuleId] = useState<HouseModuleId | null>(null);

  function handleSupplementModule(moduleId: HouseModuleId) {
    const label = HOUSE_MODULES.find((module) => module.id === moduleId)?.label ?? '';
    void Taro.showToast({ title: `${label}${TEXT.modulePending}`, icon: 'none' });
    setSelectedModuleId(null);
  }

  return (
    <PageShell scrollMode="native" contentClassName="share-page-shell">
      <View className="share-hero">
        <Text className="share-hero__title">{TEXT.title}</Text>
        <Text className="share-hero__subtitle">{TEXT.subtitle}</Text>
      </View>

      <HouseExplorer
        modules={HOUSE_MODULES}
        selectedId={selectedModuleId}
        completion={0}
        onSelect={setSelectedModuleId}
        onDismiss={() => setSelectedModuleId(null)}
        onSupplement={handleSupplementModule}
      />
    </PageShell>
  );
}
