import type { DailyTaskReplacementReason, ReplaceDailyTaskInput } from '@shared/contracts/daily-task';
import { Text, Textarea, View } from '@tarojs/components';
import { useState } from 'react';

import './index.scss';

/** 更换任务底部层参数。 */
interface TaskReplacementSheetProps {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (input: ReplaceDailyTaskInput) => void;
}

/** 私密更换原因选项。 */
const REPLACEMENT_REASONS: Array<{ value: DailyTaskReplacementReason; label: string }> = [
  { value: 'NOT_AT_HOME', label: '现在不在家' },
  { value: 'SPACE_UNAVAILABLE', label: '暂时无法进入这个空间' },
  { value: 'TIME_UNSUITABLE', label: '当前时段不合适' },
  { value: 'PRIVACY_CONCERN', label: '涉及隐私，不方便记录' },
  { value: 'OTHER', label: '其他原因' }
];

/** 通过私密原因完成当天唯一一次任务更换。 */
export function TaskReplacementSheet({
  visible,
  busy,
  onClose,
  onConfirm
}: TaskReplacementSheetProps) {
  const [reason, setReason] = useState<DailyTaskReplacementReason>('TIME_UNSUITABLE');
  const [note, setNote] = useState('');
  if (!visible) return null;

  return (
    <View className="daily-task-replacement">
      <View className="daily-task-replacement__backdrop" onClick={busy ? undefined : onClose} />
      <View className="daily-task-replacement__sheet">
        <Text className="daily-task-replacement__title">换一个更适合此刻的观察</Text>
        <Text className="daily-task-replacement__hint">原因只用于调整任务，不会公开</Text>
        <View className="daily-task-replacement__reasons">
          {REPLACEMENT_REASONS.map((item) => (
            <View
              key={item.value}
              className={`daily-task-replacement__reason${reason === item.value ? ' daily-task-replacement__reason--selected' : ''}`}
              onClick={() => setReason(item.value)}
            >
              <View className="daily-task-replacement__choice" />
              <Text>{item.label}</Text>
            </View>
          ))}
        </View>
        {reason === 'OTHER' && (
          <Textarea
            className="daily-task-replacement__note"
            maxlength={200}
            value={note}
            placeholder="简单说明原因"
            onInput={(event) => setNote(event.detail.value)}
          />
        )}
        <View className="daily-task-replacement__actions">
          <View className="daily-task-replacement__cancel" onClick={busy ? undefined : onClose}>
            <Text>取消</Text>
          </View>
          <View
            className="daily-task-replacement__confirm"
            onClick={() => {
              if (!busy) onConfirm({ reason, note: note.trim() || undefined });
            }}
          >
            <Text>{busy ? '正在更换' : '换一个任务'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
