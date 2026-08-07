import type { PublishedSpaceRecord } from '@shared/contracts/rental-space';
import { Image, ScrollView, Text, View } from '@tarojs/components';

import { frontendEnv } from '@/shared/config/env';

import './index.scss';

/** 六个空间模块的公开中文名称。 */
const MODULE_LABELS: Record<PublishedSpaceRecord['module'], string> = {
  kitchen: '厨房',
  bathroom: '卫生间',
  living: '客厅',
  bedroom: '卧室',
  hallway: '楼道',
  neighborhood: '周边环境'
};

/** 事件发生时段的阅读文案。 */
const PERIOD_LABELS = {
  MORNING: '清晨',
  DAYTIME: '白天',
  EVENING: '傍晚',
  LATE_NIGHT: '深夜'
} as const;

/** 指定日期空间信息面板属性。 */
interface SnapshotSpacePanelProps {
  record: PublishedSpaceRecord;
}

/** 将服务端相对图片地址转换为小程序可访问地址。 */
function normalizePhotoUrl(url: string): string {
  const serverBase = frontendEnv.apiBaseUrl.replace(/\/api$/, '');
  if (url.startsWith('/')) return serverBase + url;
  const uploadsIndex = url.indexOf('/uploads/');
  return uploadsIndex >= 0 ? serverBase + url.slice(uploadsIndex) : url;
}

/** 展示某个空间在指定日期固化的公开照片和居住观察。 */
export function SnapshotSpacePanel({ record }: SnapshotSpacePanelProps) {
  return (
    <View className="snapshot-space">
      <View className="snapshot-space__heading">
        <Text className="snapshot-space__title">{MODULE_LABELS[record.module]}</Text>
        {record.eventOccurredPeriod && (
          <Text className="snapshot-space__period">
            {PERIOD_LABELS[record.eventOccurredPeriod]}
          </Text>
        )}
      </View>

      {record.publicPhotos.length > 0 && (
        <ScrollView className="snapshot-space__photos" scrollX showScrollbar={false}>
          <View className="snapshot-space__photo-row">
            {record.publicPhotos.map((url, index) => (
              <Image
                key={url + index}
                className="snapshot-space__photo"
                src={normalizePhotoUrl(url)}
                mode="aspectFill"
              />
            ))}
          </View>
        </ScrollView>
      )}

      {record.observations.length > 0 && (
        <View className="snapshot-space__observations">
          {record.observations.map((observation) => (
            <View
              key={observation.label + observation.value}
              className="snapshot-space__observation"
            >
              <Text className="snapshot-space__label">{observation.label}</Text>
              <Text className="snapshot-space__value">{observation.value}</Text>
            </View>
          ))}
        </View>
      )}

      {record.eventText && <Text className="snapshot-space__story">{record.eventText}</Text>}
      {!record.eventText &&
        record.observations.length === 0 &&
        record.publicPhotos.length === 0 && (
          <Text className="snapshot-space__empty">这一天没有留下可公开的空间细节</Text>
        )}
    </View>
  );
}
