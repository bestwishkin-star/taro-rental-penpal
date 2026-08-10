/** 每日任务允许记录的非隐私事件名称。 */
export type DailyTaskEventName =
  | 'daily_task_reused'
  | 'daily_task_generated'
  | 'daily_task_started'
  | 'daily_task_completed'
  | 'daily_task_validation_failed';

/** 结构化事件只允许写入定位任务所需的标识和计数。 */
export interface DailyTaskEventPayload {
  rentalId: string;
  taskId?: string;
  templateId?: string;
  candidateCount?: number;
  factCount?: number;
  status?: string;
  errorCode?: number;
}

/** 输出不含答案、照片地址、事实值和自由文本的结构化事件。 */
export function recordDailyTaskEvent(
  event: DailyTaskEventName,
  payload: DailyTaskEventPayload
): void {
  console.info('[DailyTask]', JSON.stringify({ event, ...payload }));
}
