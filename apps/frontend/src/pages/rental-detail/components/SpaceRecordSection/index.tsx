import type { HouseModuleId, PublishedRentalSpaceResponse, RentalTrustLabel } from '@shared/contracts/rental-space';
import { Image, ScrollView, Text, View } from '@tarojs/components';
import { useEffect, useState } from 'react';

import { fetchPublishedRentalSpaces } from '@/shared/api/rental-space';
import { frontendEnv } from '@/shared/config/env';

import './index.scss';

/** 公开空间记录使用的点位中文名称。 */
const MODULE_LABELS: Record<HouseModuleId, string> = {
  kitchen: '厨房',
  bathroom: '厕所',
  living: '客厅',
  bedroom: '房间',
  hallway: '楼道',
  neighborhood: '周边环境'
};

/** 可信依据枚举对应的解释性文案，不展示真实性百分比。 */
const TRUST_LABELS: Partial<Record<RentalTrustLabel, string>> = {
  SPACE_RECORD_COMPLETE: '空间记录完整',
  CONTINUOUS_RESIDENCY: '连续居住记录',
  RESIDENCY_PROOF_VERIFIED: '居住凭证已核验',
  VERIFICATION_ONLY_PHOTOS: '照片仅作核验'
};

/** 兼容后端相对上传路径和完整 URL。 */
function normalizePhotoUrl(url: string): string {
  if (!url.startsWith('/')) return url;
  return `${frontendEnv.apiBaseUrl.replace(/\/api$/, '')}${url}`;
}

/** 空间切片详情组件参数。 */
interface SpaceRecordSectionProps {
  rentalId: string;
}

/** 新故事展示六处空间切片；旧故事没有记录时不渲染该区域。 */
export function SpaceRecordSection({ rentalId }: SpaceRecordSectionProps) {
  const [data, setData] = useState<PublishedRentalSpaceResponse | null>(null);

  useEffect(() => {
    // 组件卸载后忽略异步响应，避免更新已销毁页面状态。
    let active = true;
    void fetchPublishedRentalSpaces(rentalId)
      .then((response) => active && setData(response))
      .catch(() => active && setData(null));
    return () => {
      active = false;
    };
  }, [rentalId]);

  if (!data || data.records.length === 0) return null;

  return (
    <View className="space-record-section">
      <View className="space-record-section__heading">
        <Text className="space-record-section__eyebrow">住进每一个具体角落</Text>
        <Text className="space-record-section__title">六处空间记录</Text>
        <View className="space-record-section__trust">
          {data.trustEvidence.labels.map((label) => (
            <Text className="space-record-section__trust-label" key={label}>{TRUST_LABELS[label]}</Text>
          ))}
        </View>
      </View>

      {data.records.map((record) => (
        <View className="space-record-section__record" key={record.module}>
          <Text className="space-record-section__module">{MODULE_LABELS[record.module]}</Text>
          {record.publicPhotos.length > 0 && (
            <ScrollView scrollX showScrollbar={false} className="space-record-section__photos">
              <View className="space-record-section__photo-row">
                {record.publicPhotos.map((photo) => (
                  <Image
                    key={photo}
                    src={normalizePhotoUrl(photo)}
                    mode="aspectFill"
                    className="space-record-section__photo"
                  />
                ))}
              </View>
            </ScrollView>
          )}
          <View className="space-record-section__observations">
            {record.observations.map((observation) => (
              <View className="space-record-section__observation" key={observation.label}>
                <Text className="space-record-section__observation-label">{observation.label}</Text>
                <Text className="space-record-section__observation-value">{observation.value}</Text>
              </View>
            ))}
          </View>
          {record.eventText && <Text className="space-record-section__story">{record.eventText}</Text>}
        </View>
      ))}
    </View>
  );
}
