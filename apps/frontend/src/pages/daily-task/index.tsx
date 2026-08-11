import type {
  CompleteDailyTaskResult,
  DailyTaskDetail,
  DailyTaskPhotoChallenge,
  ReplaceDailyTaskInput
} from '@shared/contracts/daily-task';
import { Text, View } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';

import {
  completeDailyTask,
  createDailyTaskPhotoChallenge,
  fetchTodayDailyTask,
  replaceDailyTask,
  startDailyTask
} from '@/shared/api/daily-task';
import { uploadPhotoAsset } from '@/shared/api/rental-space';
import { AppLayout } from '@/shared/ui/app-layout';

import { DailyEventTask } from './components/DailyEventTask';
import { PhotoEvidenceTask } from './components/PhotoEvidenceTask';
import { QuickMeasurementTask } from './components/QuickMeasurementTask';
import { TaskCompletionSummary } from './components/TaskCompletionSummary';
import { TaskIntro } from './components/TaskIntro';
import { TaskReplacementSheet } from './components/TaskReplacementSheet';
import { TaskVisibilityControl } from './components/TaskVisibilityControl';
import { TimedObservationTask } from './components/TimedObservationTask';
import {
  buildCompleteInput,
  clearTaskDraft,
  createTaskDraft,
  restoreTaskDraft,
  saveTaskDraft,
  validateTaskDraft,
  type DailyTaskDraft
} from './task-form-state';

import './index.scss';

/** 页面只维护的有限交互阶段。 */
type DailyTaskPageStage = 'LOADING' | 'INTRO' | 'TASK' | 'COMPLETED' | 'ERROR';

/** 从接口异常中提取适合 Toast 的短文案。 */
function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** 每日房屋观察任务页面，只负责数据、草稿和业务组件编排。 */
export default function DailyTaskPage() {
  const router = useRouter();
  const rentalId = router.params.rentalId ?? '';
  const [stage, setStage] = useState<DailyTaskPageStage>('LOADING');
  const [task, setTask] = useState<DailyTaskDetail | null>(null);
  const [draft, setDraft] = useState<DailyTaskDraft | null>(null);
  const [challenge, setChallenge] = useState<DailyTaskPhotoChallenge | null>(null);
  const [completion, setCompletion] = useState<CompleteDailyTaskResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [replacementVisible, setReplacementVisible] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());

  /** 从服务端刷新任务状态，并仅在任务变化时恢复对应草稿。 */
  async function refreshTask() {
    if (!rentalId || completion || busy) return;
    try {
      const response = await fetchTodayDailyTask(rentalId);
      if (response.completedToday) {
        setTask(null);
        setError('今天的观察已经完成');
        setStage('COMPLETED');
        return;
      }
      if (!response.task) {
        setError('今天暂时没有可用观察');
        setStage('ERROR');
        return;
      }
      const nextTask = response.task;
      setTask(nextTask);
      setDraft((current) => {
        if (current && task?.id === nextTask.id) return current;
        return restoreTaskDraft(nextTask.id) ?? createTaskDraft(nextTask);
      });
      setStage(nextTask.status === 'ASSIGNED' ? 'INTRO' : 'TASK');
      setError('');
    } catch (loadError) {
      setError(getErrorMessage(loadError, '今日观察加载失败'));
      setStage('ERROR');
    }
  }

  useDidShow(() => {
    void refreshTask();
  });

  useEffect(() => {
    if (stage !== 'TASK' || !task?.startedAt) return undefined;
    setClockNow(Date.now());
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stage, task?.startedAt]);

  const elapsedSeconds = useMemo(() => {
    if (!task?.startedAt) return 0;
    return Math.max(0, Math.floor((clockNow - Date.parse(task.startedAt)) / 1000));
  }, [clockNow, task?.startedAt]);

  /** 更新并立即持久化当前任务草稿。 */
  function updateDraft(nextDraft: DailyTaskDraft) {
    if (!task) return;
    setDraft(nextDraft);
    saveTaskDraft(task.id, nextDraft);
  }

  /** 为照片任务签发或刷新一次性现场拍摄提示。 */
  async function renewPhotoChallenge(currentTask = task) {
    if (!currentTask || currentTask.type !== 'PHOTO_EVIDENCE') return;
    try {
      setBusy(true);
      const nextChallenge = await createDailyTaskPhotoChallenge(rentalId, currentTask.id);
      setChallenge(nextChallenge);
      setDraft((current) => {
        const nextDraft = current ?? createTaskDraft(currentTask);
        const updated = { ...nextDraft, challengeId: nextChallenge.id, photoAssetIds: [] };
        saveTaskDraft(currentTask.id, updated);
        return updated;
      });
    } catch (challengeError) {
      void Taro.showToast({
        title: getErrorMessage(challengeError, '拍摄提示获取失败'),
        icon: 'none'
      });
    } finally {
      setBusy(false);
    }
  }

  /** 开始任务并以服务端 startedAt 作为后续计时基准。 */
  async function handleStart() {
    if (!task || busy) return;
    try {
      setBusy(true);
      const startedTask = await startDailyTask(rentalId, task.id);
      setTask(startedTask);
      setStage('TASK');
      setClockNow(Date.now());
      if (startedTask.type === 'PHOTO_EVIDENCE') await renewPhotoChallenge(startedTask);
    } catch (startError) {
      void Taro.showToast({ title: getErrorMessage(startError, '任务开始失败'), icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 按当前挑战打开相机并上传统一图片资产。 */
  async function handleCapture() {
    if (!task || !draft || busy) return;
    if (!challenge) {
      await renewPhotoChallenge();
      return;
    }
    try {
      setBusy(true);
      const media = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['camera']
      });
      const filePath = media.tempFiles[0]?.tempFilePath;
      if (!filePath) return;
      const asset = await uploadPhotoAsset(filePath);
      updateDraft({
        ...draft,
        challengeId: challenge.id,
        photoAssetIds: [asset.assetId]
      });
    } catch (captureError) {
      void Taro.showToast({ title: getErrorMessage(captureError, '现场照片上传失败'), icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 使用当天唯一机会替换未开始的任务。 */
  async function handleReplace(input: ReplaceDailyTaskInput) {
    if (!task || busy) return;
    try {
      setBusy(true);
      const replacement = await replaceDailyTask(rentalId, task.id, input);
      clearTaskDraft(task.id);
      const replacementDraft = restoreTaskDraft(replacement.id) ?? createTaskDraft(replacement);
      setTask(replacement);
      setDraft(replacementDraft);
      setChallenge(null);
      setStage('INTRO');
      setReplacementVisible(false);
    } catch (replaceError) {
      void Taro.showToast({ title: getErrorMessage(replaceError, '任务更换失败'), icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 校验草稿并提交完成命令，网络失败时保留同一幂等键。 */
  async function handleComplete() {
    if (!task || !draft || busy) return;
    const validation = validateTaskDraft(task, draft);
    if (!validation.valid) {
      void Taro.showToast({ title: validation.reason, icon: 'none' });
      return;
    }
    if (task.type === 'TIMED_OBSERVATION' && elapsedSeconds < task.estimatedSeconds) {
      void Taro.showToast({ title: '再观察一会儿再记录', icon: 'none' });
      return;
    }
    try {
      setBusy(true);
      saveTaskDraft(task.id, draft);
      const result = await completeDailyTask(rentalId, task.id, buildCompleteInput(draft));
      clearTaskDraft(task.id);
      setCompletion(result);
      setStage('COMPLETED');
    } catch (completeError) {
      void Taro.showToast({ title: getErrorMessage(completeError, '观察保存失败'), icon: 'none' });
    } finally {
      setBusy(false);
    }
  }

  /** 跳转房主模型并传递一次性高亮空间和快照日期。 */
  function handleViewHouse() {
    if (!completion) return;
    const query =
      `rentalId=${encodeURIComponent(rentalId)}` +
      `&updatedModule=${completion.updatedModule}&snapshotDate=${completion.snapshotDate}`;
    void Taro.redirectTo({ url: `/pages/share/index?${query}` });
  }

  if (stage === 'LOADING') {
    return (
      <AppLayout mode="list" contentClassName="daily-task-page">
        <View className="daily-task-page__state"><Text>正在准备今天的观察</Text></View>
      </AppLayout>
    );
  }

  if (stage === 'ERROR' || (!task && !completion)) {
    return (
      <AppLayout mode="list" contentClassName="daily-task-page">
        <View className="daily-task-page__state daily-task-page__state--error">
          <Text>{error || '今天的观察已经完成'}</Text>
          {stage === 'ERROR' && (
            <View className="daily-task-page__retry" onClick={() => void refreshTask()}>
              <Text>重新加载</Text>
            </View>
          )}
        </View>
      </AppLayout>
    );
  }

  if (completion) {
    return (
      <AppLayout mode="list" contentClassName="daily-task-page">
        <TaskCompletionSummary result={completion} onViewHouse={handleViewHouse} />
      </AppLayout>
    );
  }

  if (!task || !draft) return null;

  return (
    <AppLayout mode="list" contentClassName="daily-task-page">
      <View className="daily-task-page__content">
        <TaskIntro task={task} />

        {stage === 'TASK' && (
          <>
            {task.type === 'TIMED_OBSERVATION' && (
              <TimedObservationTask
                task={task}
                draft={draft}
                elapsedSeconds={elapsedSeconds}
                onChange={updateDraft}
              />
            )}
            {task.type === 'PHOTO_EVIDENCE' && (
              <PhotoEvidenceTask
                task={task}
                draft={draft}
                challenge={challenge}
                busy={busy}
                onChange={updateDraft}
                onCapture={() => void handleCapture()}
                onRenewChallenge={() => void renewPhotoChallenge()}
              />
            )}
            {task.type === 'QUICK_MEASUREMENT' && (
              <QuickMeasurementTask task={task} draft={draft} onChange={updateDraft} />
            )}
            {task.type === 'DAILY_EVENT' && (
              <DailyEventTask task={task} draft={draft} onChange={updateDraft} />
            )}
            <TaskVisibilityControl
              draft={draft}
              showPhotoVisibility={task.requiresPhoto}
              onChange={updateDraft}
            />
          </>
        )}

        <View className="daily-task-page__actions">
          {stage === 'INTRO' && task.remainingReplacements > 0 && (
            <View
              className="daily-task-page__secondary-action"
              onClick={() => setReplacementVisible(true)}
            >
              <Text>换一个任务</Text>
            </View>
          )}
          <View
            className={`daily-task-page__primary-action${busy ? ' daily-task-page__primary-action--disabled' : ''}`}
            hoverClass="daily-task-page__primary-action--active"
            onClick={() => void (stage === 'INTRO' ? handleStart() : handleComplete())}
          >
            <Text>{busy ? '请稍候' : stage === 'INTRO' ? '开始观察' : '完成这次观察'}</Text>
          </View>
        </View>
      </View>

      <TaskReplacementSheet
        visible={replacementVisible}
        busy={busy}
        onClose={() => setReplacementVisible(false)}
        onConfirm={(input) => void handleReplace(input)}
      />
    </AppLayout>
  );
}
