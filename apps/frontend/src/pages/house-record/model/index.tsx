import type { HouseRecordSnapshotResponse } from '@shared/contracts/house-record';
import type { HouseModuleId } from '@shared/contracts/rental-space';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import { fetchHouseRecordSnapshot } from '@/shared/api/house-record';
import {
  HouseExplorer,
  type HouseModule
} from '@/shared/ui/house-explorer';
import { AppLayout } from '@/shared/ui/app-layout';

import { SnapshotSpacePanel } from './components/SnapshotSpacePanel';

import './index.scss';

/** 只读模型热点名称和提示文案。 */
const HOUSE_MODULES: HouseModule[] = [
  { id: 'kitchen', label: '厨房', prompt: '查看这一天的厨房记录', completed: false },
  { id: 'bathroom', label: '卫生间', prompt: '查看这一天的卫生间记录', completed: false },
  { id: 'living', label: '客厅', prompt: '查看这一天的客厅记录', completed: false },
  { id: 'bedroom', label: '卧室', prompt: '查看这一天的卧室记录', completed: false },
  { id: 'hallway', label: '楼道', prompt: '查看这一天的楼道记录', completed: false },
  { id: 'neighborhood', label: '周边环境', prompt: '查看这一天的周边记录', completed: false }
];

/** 快照来源的公开说明。 */
const SOURCE_LABELS: Record<HouseRecordSnapshotResponse['source'], string> = {
  MANUAL_UPDATE: '房主主动更新',
  RANDOM_TASK: '日常任务记录',
  SYSTEM: '首次公开记录'
};

/** 指定日期只读房屋模型页。 */
export default function HouseRecordModelPage() {
  const [snapshot, setSnapshot] = useState<HouseRecordSnapshotResponse | null>(null);
  const [selectedId, setSelectedId] = useState<HouseModuleId | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params ?? {};
    if (!params.rentalId || !params.snapshotDate) {
      setFailed(true);
      setLoading(false);
      return;
    }

    fetchHouseRecordSnapshot(params.rentalId, params.snapshotDate)
      .then((data) => {
        setSnapshot(data);
        setSelectedId(data.records[0]?.module ?? null);
        setFailed(false);
      })
      .catch(() => {
        setFailed(true);
        void Taro.showToast({ title: '这一天的房屋实录暂时无法打开', icon: 'none' });
      })
      .finally(() => setLoading(false));
  }, []);

  /** 将快照记录映射为三维热点完成状态。 */
  const modules = useMemo<HouseModule[]>(() => {
    const completed = new Set(snapshot?.records.map((record) => record.module) ?? []);
    return HOUSE_MODULES.map((module) => ({ ...module, completed: completed.has(module.id) }));
  }, [snapshot]);

  const selectedRecord =
    snapshot?.records.find((record) => record.module === selectedId) ?? null;
  const completion = snapshot
    ? Math.round((snapshot.records.length / HOUSE_MODULES.length) * 100)
    : 0;

  if (loading) {
    return (
      <AppLayout mode="native" contentClassName="model-state">
        <Text className="model-state__text">正在还原这一天的房屋...</Text>
      </AppLayout>
    );
  }

  if (failed || !snapshot) {
    return (
      <AppLayout mode="native" contentClassName="model-state">
        <Text className="model-state__title">没有找到这一天的房屋实录</Text>
        <Text className="model-state__text">返回成长树选择另一个更新日期</Text>
      </AppLayout>
    );
  }

  return (
    <AppLayout mode="list" contentClassName="model-page">
      <View className="model-header">
        <Text className="model-header__date">{snapshot.snapshotDate}</Text>
        <Text className="model-header__source">{SOURCE_LABELS[snapshot.source]}</Text>
      </View>

      {!webglUnavailable && (
        <View className="model-explorer">
          <HouseExplorer
            mode="readonly"
            modules={modules}
            selectedId={selectedId}
            completion={completion}
            onSelect={setSelectedId}
            onWebglUnavailable={() => setWebglUnavailable(true)}
          />
        </View>
      )}

      {webglUnavailable ? (
        <View className="model-fallback">
          <Text className="model-fallback__notice">当前设备无法显示三维模型，已切换为空间记录</Text>
          {snapshot.records.map((record) => (
            <SnapshotSpacePanel key={record.module} record={record} />
          ))}
        </View>
      ) : (
        selectedRecord && <SnapshotSpacePanel record={selectedRecord} />
      )}
    </AppLayout>
  );
}
