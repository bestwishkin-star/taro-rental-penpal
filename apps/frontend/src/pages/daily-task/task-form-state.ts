import type {
  CompleteDailyTaskInput,
  DailyTaskAnswerValue,
  DailyTaskDetail,
  DailyTaskVisibility
} from '@shared/contracts/daily-task';
import Taro from '@tarojs/taro';

/** 每日任务草稿存储键前缀，任务之间互不覆盖。 */
const TASK_DRAFT_STORAGE_PREFIX = 'daily_task_draft:';

/** 页面维护的可恢复任务草稿。 */
export interface DailyTaskDraft {
  idempotencyKey: string;
  answers: Record<string, DailyTaskAnswerValue>;
  measurementValues: Record<string, number>;
  photoAssetIds: string[];
  challengeId?: string;
  conclusionVisibility: DailyTaskVisibility;
  photoVisibility: DailyTaskVisibility;
}

/** 草稿校验结果，用于将错误提示放在对应任务内容附近。 */
export type DailyTaskDraftValidation =
  | { valid: true }
  | { valid: false; reason: string };

/** 生成一次提交链路内稳定、跨网络重试复用的幂等键。 */
function createIdempotencyKey(): string {
  return `daily-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 生成任务草稿；首次公开范围默认为私密。 */
export function createTaskDraft(
  _task: DailyTaskDetail,
  idempotencyKey = createIdempotencyKey()
): DailyTaskDraft {
  return {
    idempotencyKey,
    answers: {},
    measurementValues: {},
    photoAssetIds: [],
    conclusionVisibility: 'PRIVATE',
    photoVisibility: 'PRIVATE'
  };
}

/** 判断普通答案是否已经填写。 */
function hasAnswer(value: DailyTaskAnswerValue | undefined): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return Array.isArray(value) && value.length > 0;
}

/** 按任务问题结构校验照片、测量值和结构化答案。 */
export function validateTaskDraft(
  task: DailyTaskDetail,
  draft: DailyTaskDraft
): DailyTaskDraftValidation {
  if (task.requiresPhoto && (!draft.challengeId || draft.photoAssetIds.length === 0)) {
    return { valid: false, reason: '请先完成现场拍摄' };
  }

  for (const question of task.questions) {
    if (question.kind === 'NUMBER') {
      const value = draft.measurementValues[question.id];
      if (!Number.isFinite(value)) return { valid: false, reason: `请填写${question.label}` };
      if (question.min !== undefined && value < question.min) {
        return {
          valid: false,
          reason: `${question.label}应在 ${question.min} 到 ${question.max ?? '合理范围'} 之间`
        };
      }
      if (question.max !== undefined && value > question.max) {
        return {
          valid: false,
          reason: `${question.label}应在 ${question.min ?? '合理范围'} 到 ${question.max} 之间`
        };
      }
      continue;
    }

    const value = draft.answers[question.id];
    if (!hasAnswer(value)) return { valid: false, reason: `请完成${question.label}` };
    if (question.kind === 'SHORT_TEXT' && String(value).trim().length < 5) {
      return { valid: false, reason: `${question.label}至少填写 5 个字` };
    }
  }

  return { valid: true };
}

/** 将页面草稿转换为后端完成接口输入，禁止由客户端提交事实键。 */
export function buildCompleteInput(
  draft: DailyTaskDraft,
  observedAt = new Date().toISOString()
): CompleteDailyTaskInput {
  return {
    idempotencyKey: draft.idempotencyKey,
    answers: draft.answers,
    measurementValues: draft.measurementValues,
    photoAssetIds: draft.photoAssetIds,
    challengeId: draft.challengeId,
    conclusionVisibility: draft.conclusionVisibility,
    photoVisibility: draft.photoVisibility,
    observedAt
  };
}

/** 保存尚未成功提交的任务草稿。 */
export function saveTaskDraft(taskId: string, draft: DailyTaskDraft): void {
  Taro.setStorageSync(`${TASK_DRAFT_STORAGE_PREFIX}${taskId}`, draft);
}

/** 恢复同一任务草稿；异常历史数据降级为空草稿。 */
export function restoreTaskDraft(taskId: string): DailyTaskDraft | null {
  const value = Taro.getStorageSync<DailyTaskDraft | ''>(`${TASK_DRAFT_STORAGE_PREFIX}${taskId}`);
  if (!value || typeof value !== 'object' || typeof value.idempotencyKey !== 'string') return null;
  return value;
}

/** 任务完成或过期后清理本地草稿。 */
export function clearTaskDraft(taskId: string): void {
  Taro.removeStorageSync(`${TASK_DRAFT_STORAGE_PREFIX}${taskId}`);
}
