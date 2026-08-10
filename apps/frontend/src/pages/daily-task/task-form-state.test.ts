import type { DailyTaskDetail } from '@shared/contracts/daily-task';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, unknown>();

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: (key: string) => storage.get(key) ?? '',
    setStorageSync: (key: string, value: unknown) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key)
  }
}));

import {
  buildCompleteInput,
  clearTaskDraft,
  createTaskDraft,
  restoreTaskDraft,
  saveTaskDraft,
  validateTaskDraft
} from './task-form-state';

/** 创建测试所需的最小任务详情。 */
function createTask(overrides: Partial<DailyTaskDetail> = {}): DailyTaskDetail {
  return {
    id: 'task-1',
    rentalId: 'rental-1',
    taskDate: '2026-08-10',
    module: 'bedroom',
    type: 'TIMED_OBSERVATION',
    status: 'ASSIGNED',
    title: '听一听卧室声音',
    prompt: '安静观察一分钟',
    explanation: '卧室已有一段时间没有新记录',
    estimatedSeconds: 60,
    expiresAt: '2026-08-10T15:59:59.999Z',
    requiresPhoto: false,
    questions: [
      {
        id: 'noise_level',
        label: '最明显的声音',
        kind: 'SINGLE_CHOICE',
        options: [{ value: 'quiet', label: '安静' }]
      }
    ],
    remainingReplacements: 1,
    publicProjectionStatus: 'NOT_REQUESTED',
    ...overrides
  };
}

describe('daily task form state', () => {
  beforeEach(() => storage.clear());

  it('照片任务缺少拍摄挑战或图片时不可提交', () => {
    const task = createTask({ type: 'PHOTO_EVIDENCE', requiresPhoto: true });
    const draft = createTaskDraft(task);

    expect(validateTaskDraft(task, draft)).toEqual({
      valid: false,
      reason: '请先完成现场拍摄'
    });
  });

  it('数字问题从 measurementValues 读取并校验范围', () => {
    const task = createTask({
      type: 'QUICK_MEASUREMENT',
      questions: [{ id: 'wait_seconds', label: '等待秒数', kind: 'NUMBER', min: 0, max: 600 }]
    });
    const draft = createTaskDraft(task);
    draft.measurementValues.wait_seconds = 601;

    expect(validateTaskDraft(task, draft)).toEqual({
      valid: false,
      reason: '等待秒数应在 0 到 600 之间'
    });
  });

  it('网络重试恢复草稿时保留原幂等键', () => {
    const task = createTask();
    const draft = createTaskDraft(task, 'idempotency-1');
    draft.answers.noise_level = 'quiet';
    saveTaskDraft(task.id, draft);

    expect(restoreTaskDraft(task.id)).toMatchObject({
      idempotencyKey: 'idempotency-1',
      answers: { noise_level: 'quiet' }
    });

    clearTaskDraft(task.id);
    expect(restoreTaskDraft(task.id)).toBeNull();
  });

  it('构建完成请求时分别保留结论和照片可见范围', () => {
    const task = createTask({ type: 'PHOTO_EVIDENCE', requiresPhoto: true });
    const draft = createTaskDraft(task, 'idempotency-2');
    draft.answers.noise_level = 'quiet';
    draft.photoAssetIds = ['asset-1'];
    draft.challengeId = 'challenge-1';
    draft.conclusionVisibility = 'PUBLIC';
    draft.photoVisibility = 'PRIVATE';

    expect(buildCompleteInput(draft, '2026-08-10T08:00:00.000Z')).toMatchObject({
      idempotencyKey: 'idempotency-2',
      conclusionVisibility: 'PUBLIC',
      photoVisibility: 'PRIVATE',
      photoAssetIds: ['asset-1'],
      challengeId: 'challenge-1'
    });
  });
});
