import type {
  CompleteDailyTaskInput,
  CompleteDailyTaskResult,
  DailyTaskActivitySummary,
  DailyTaskDetail,
  DailyTaskPhotoChallenge,
  DailyTaskTodayResponse,
  OwnerSpaceFactSummary,
  ReplaceDailyTaskInput
} from '@shared/contracts/daily-task';

import { httpRequest } from './http';

/** 获取指定房屋的今日观察任务，不存在时由服务端幂等生成。 */
export function fetchTodayDailyTask(rentalId: string) {
  return httpRequest<DailyTaskTodayResponse>(`/rentals/${rentalId}/daily-task/today`);
}

/** 开始需要服务端计时的观察任务。 */
export function startDailyTask(rentalId: string, taskId: string) {
  return httpRequest<DailyTaskDetail>(`/rentals/${rentalId}/daily-task/${taskId}/start`, {
    method: 'POST'
  });
}

/** 使用当天唯一一次机会更换任务。 */
export function replaceDailyTask(
  rentalId: string,
  taskId: string,
  body: ReplaceDailyTaskInput
) {
  return httpRequest<DailyTaskDetail, ReplaceDailyTaskInput>(
    `/rentals/${rentalId}/daily-task/${taskId}/replace`,
    { method: 'POST', body }
  );
}

/** 获取绑定任务和模板版本的一次性现场拍摄挑战。 */
export function createDailyTaskPhotoChallenge(rentalId: string, taskId: string) {
  return httpRequest<DailyTaskPhotoChallenge>(
    `/rentals/${rentalId}/daily-task/${taskId}/photo-challenge`,
    { method: 'POST' }
  );
}

/** 完成任务并触发房屋事实与当天快照更新。 */
export function completeDailyTask(
  rentalId: string,
  taskId: string,
  body: CompleteDailyTaskInput
) {
  return httpRequest<CompleteDailyTaskResult, CompleteDailyTaskInput>(
    `/rentals/${rentalId}/daily-task/${taskId}/complete`,
    { method: 'POST', body }
  );
}

/** 读取房主指定窗口内的有效观察活跃度。 */
export function fetchDailyTaskActivitySummary(rentalId: string, days = 30) {
  return httpRequest<DailyTaskActivitySummary>(`/rentals/${rentalId}/activity-summary`, {
    params: { days: String(days) }
  });
}

/** 读取房主当前六空间事实和数据新鲜度。 */
export function fetchOwnerSpaceFacts(rentalId: string) {
  return httpRequest<OwnerSpaceFactSummary[]>(`/rentals/${rentalId}/space-facts`);
}
