import type { RentalReportReason } from '@shared/contracts/rental';
import { Button, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { createRentalReport } from '@/shared/api/services';

import './index.scss';

const REASON_OPTIONS: Array<{ label: string; value: RentalReportReason }> = [
  { label: '费用或地点不实', value: 'fake_rent_or_address' },
  { label: '冒充真实体验', value: 'fake_experience' },
  { label: '商业推广伪装', value: 'agent_disguise' },
  { label: '诱导引流', value: 'phishing' },
  { label: '隐私泄露', value: 'privacy_leak' },
  { label: '攻击骚扰', value: 'harassment' },
  { label: '其他', value: 'other' }
];

interface Props {
  rentalId: string;
  visible: boolean;
  onClose: () => void;
}

/** 屋檐故事举报面板。 */
export function ReportPanel({ rentalId, visible, onClose }: Props) {
  const [reason, setReason] = useState<RentalReportReason>('fake_rent_or_address');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  async function handleSubmit() {
    if (!description.trim()) {
      void Taro.showToast({ title: '请填写举报说明', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      await createRentalReport(rentalId, { reason, description: description.trim() });
      void Taro.showToast({ title: '举报已提交', icon: 'success' });
      setDescription('');
      onClose();
    } catch {
      void Taro.showToast({ title: '举报提交失败', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="report-panel">
      <View className="report-panel__body">
        <Text className="report-panel__title">举报这篇屋檐故事</Text>
        <View className="report-panel__reasons">
          {REASON_OPTIONS.map((item) => (
            <View
              key={item.value}
              className={`report-panel__reason${reason === item.value ? ' report-panel__reason--active' : ''}`}
              onClick={() => setReason(item.value)}
            >
              <Text className="report-panel__reason-text">{item.label}</Text>
            </View>
          ))}
        </View>
        <Textarea
          className="report-panel__textarea"
          value={description}
          placeholder="说明你发现的问题，便于平台复核"
          onInput={(event) => setDescription(event.detail.value)}
          maxlength={300}
        />
        <View className="report-panel__actions">
          <Button className="report-panel__cancel" onClick={onClose}>
            取消
          </Button>
          <Button className="report-panel__submit" loading={submitting} onClick={handleSubmit}>
            提交
          </Button>
        </View>
      </View>
    </View>
  );
}
