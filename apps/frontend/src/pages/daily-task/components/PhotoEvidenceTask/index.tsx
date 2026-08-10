import type { DailyTaskDetail, DailyTaskPhotoChallenge } from '@shared/contracts/daily-task';
import { Image, Text, View } from '@tarojs/components';

import iconCamera from '@/assets/icons/daily-task/icon-camera.png';

import type { DailyTaskDraft } from '../../task-form-state';
import { TaskQuestionFields } from '../TaskQuestionFields';

import './index.scss';

/** 现场照片任务参数。 */
interface PhotoEvidenceTaskProps {
  task: DailyTaskDetail;
  draft: DailyTaskDraft;
  challenge: DailyTaskPhotoChallenge | null;
  busy: boolean;
  onChange: (draft: DailyTaskDraft) => void;
  onCapture: () => void;
  onRenewChallenge: () => void;
}

/** 展示随机现场拍摄挑战和结构化居住感受。 */
export function PhotoEvidenceTask({
  task,
  draft,
  challenge,
  busy,
  onChange,
  onCapture,
  onRenewChallenge
}: PhotoEvidenceTaskProps) {
  const hasPhoto = draft.photoAssetIds.length > 0;
  return (
    <View className="daily-task-photo">
      <View className="daily-task-photo__challenge">
        <View className="daily-task-photo__challenge-head">
          <Image src={iconCamera} className="daily-task-photo__icon" mode="aspectFit" />
          <Text className="daily-task-photo__challenge-title">此刻的拍摄提示</Text>
        </View>
        <Text className="daily-task-photo__prompt">
          {challenge?.prompt ?? (hasPhoto
            ? '已恢复上次未提交的现场照片'
            : '正在准备一条仅本次有效的现场提示')}
        </Text>
        <View
          className={`daily-task-photo__capture${hasPhoto ? ' daily-task-photo__capture--done' : ''}`}
          hoverClass="daily-task-photo__capture--active"
          onClick={busy ? undefined : onCapture}
        >
          <Image src={iconCamera} className="daily-task-photo__capture-icon" mode="aspectFit" />
          <Text className="daily-task-photo__capture-title">
            {hasPhoto ? '现场照片已记录' : busy ? '正在上传' : '打开相机记录现场'}
          </Text>
          <Text className="daily-task-photo__capture-hint">
            {hasPhoto ? '重新拍摄会替换本次照片' : '仅允许使用相机，不从相册选择'}
          </Text>
        </View>
        <View
          className="daily-task-photo__renew"
          hoverClass="daily-task-photo__renew--active"
          onClick={busy ? undefined : onRenewChallenge}
        >
          <Text>换一条拍摄提示</Text>
        </View>
      </View>
      <TaskQuestionFields task={task} draft={draft} onChange={onChange} />
    </View>
  );
}
