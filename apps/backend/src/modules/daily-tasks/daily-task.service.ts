import type {
  DailyTaskActivitySummary,
  DailyTaskDetail,
  DailyTaskTodayResponse
} from '@shared/contracts/daily-task';
import { BizCode } from '@shared/errors';

import { AppError } from '@/lib/errors';
import { getShanghaiDate } from '@/modules/house-records/house-record-date';

import { recordDailyTaskEvent } from './daily-task-events';
import {
  findDailyTaskBySlot,
  getActivitySummary,
  getLatestSnapshotDate,
  getOwnedRentalState,
  insertDailyTask,
  listRecentTaskHistory,
  markTaskStarted,
  type DailyTaskHistoryItem,
  type DailyTaskRecord
} from './daily-task.repository';
import { selectDailyTaskTemplate } from './daily-task.selector';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import type { DailyTaskPeriod, DailyTaskTemplate } from './daily-task.types';

/** 每日任务活跃度接口允许查询的最大天数。 */
const MAX_ACTIVITY_DAYS = 30;

/** 将纯日期按 UTC 日历平移，避免服务器本地时区参与自然日计算。 */
function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** 计算两个纯日期之间的非负自然日差。 */
function differenceInDays(laterDate: string, earlierDate: string): number {
  const later = Date.parse(`${laterDate}T00:00:00.000Z`);
  const earlier = Date.parse(`${earlierDate}T00:00:00.000Z`);
  return Math.max(0, Math.round((later - earlier) / 86_400_000));
}

/** 返回当前上海粗粒度时段，不记录用户精确作息。 */
function getShanghaiPeriod(now: Date): DailyTaskPeriod {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      hourCycle: 'h23'
    }).format(now)
  );
  if (hour >= 5 && hour < 11) return 'MORNING';
  if (hour >= 11 && hour < 18) return 'DAYTIME';
  if (hour >= 18 && hour < 23) return 'EVENING';
  return 'LATE_NIGHT';
}

/** 将下一上海自然日零点转换为可写入 MySQL 的绝对时间。 */
function getNextShanghaiMidnight(taskDate: string): Date {
  return new Date(`${shiftDate(taskDate, 1)}T00:00:00.000+08:00`);
}

/** 按模板标识和版本读取不可变规则定义。 */
function findTemplate(templateId: string, version: number): DailyTaskTemplate | undefined {
  return DAILY_TASK_TEMPLATES.find(
    (template) => template.id === templateId && template.version === version
  );
}

/** 将数据库任务映射为客户端可见合同，不暴露权重快照。 */
function toTaskDetail(record: DailyTaskRecord, remainingReplacements: number): DailyTaskDetail {
  const template = record.template ?? findTemplate(record.templateId, record.templateVersion);
  if (!template) throw new AppError(BizCode.TASK_TEMPLATE_VERSION_UNAVAILABLE);
  return {
    id: record.id,
    rentalId: record.rentalId,
    taskDate: record.taskDate,
    module: template.module,
    type: template.type,
    status: record.status,
    title: template.title,
    prompt: template.prompt,
    explanation: record.assignmentReason || template.explanation,
    estimatedSeconds: template.estimatedSeconds,
    expiresAt: record.expiresAt,
    startedAt: record.startedAt,
    requiresPhoto: template.evidenceRequirement.requiresPhoto,
    questions: [...template.questionSchema],
    remainingReplacements,
    publicProjectionStatus: record.publicProjectionStatus
  };
}

/** 校验房屋所有权和公开状态。 */
async function assertPublishedOwner(ownerOpenid: string, rentalId: string): Promise<void> {
  const state = await getOwnedRentalState(ownerOpenid, rentalId);
  if (state === 'NOT_OWNED') throw new AppError(BizCode.RENTAL_PERMISSION_DENIED);
  if (state === 'NOT_PUBLISHED') throw new AppError(BizCode.RENTAL_NOT_PUBLISHED);
}

/** 判断数据库异常是否仅为任务唯一索引并发冲突。 */
function isDuplicateEntry(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; errno?: number };
  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062;
}

/** 从历史任务中筛选仍处于各自模板冷却期的模板。 */
function getCoolingTemplateIds(taskDate: string, history: DailyTaskHistoryItem[]): string[] {
  return history.flatMap((item) => {
    const template = findTemplate(item.templateId, item.templateVersion);
    if (!template) return [];
    return differenceInDays(taskDate, item.taskDate) <= template.cooldownDays
      ? [item.templateId]
      : [];
  });
}

/** 读取最近两次空间并调整为从旧到新的顺序，供连续空间规则判断。 */
function getRecentModules(history: DailyTaskHistoryItem[]) {
  return history
    .slice(0, 2)
    .map((item) => item.module)
    .reverse();
}

/** 读取当前生效任务；替换任务优先于原始任务。 */
async function findCurrentTask(rentalId: string, taskDate: string) {
  const replacement = await findDailyTaskBySlot(rentalId, taskDate, 1);
  if (replacement) return { task: replacement, remainingReplacements: 0 };
  const original = await findDailyTaskBySlot(rentalId, taskDate, 0);
  return original ? { task: original, remainingReplacements: original.status === 'ASSIGNED' ? 1 : 0 } : null;
}

/** 获取或幂等生成指定房屋的今日任务。 */
export async function getOrCreateTodayTask(
  ownerOpenid: string,
  rentalId: string,
  now = new Date()
): Promise<DailyTaskTodayResponse> {
  await assertPublishedOwner(ownerOpenid, rentalId);
  const taskDate = getShanghaiDate(now);
  const rangeStart = shiftDate(taskDate, -(MAX_ACTIVITY_DAYS - 1));
  let current = await findCurrentTask(rentalId, taskDate);

  if (!current) {
    const history = await listRecentTaskHistory(rentalId, taskDate, 30);
    const selection = selectDailyTaskTemplate({
      templates: DAILY_TASK_TEMPLATES,
      taskDate,
      period: getShanghaiPeriod(now),
      recentTemplateIds: getCoolingTemplateIds(taskDate, history),
      recentModules: getRecentModules(history),
      staleDaysByFact: {},
      seed: `${rentalId}:${taskDate}:0`
    });
    try {
      const task = await insertDailyTask({
        rentalId,
        ownerOpenid,
        taskDate,
        slot: 0,
        selection,
        expiresAt: getNextShanghaiMidnight(taskDate)
      });
      current = { task, remainingReplacements: 1 };
      recordDailyTaskEvent('daily_task_generated', {
        rentalId,
        taskId: task.id,
        templateId: task.templateId,
        candidateCount: selection.candidates.length,
        status: task.status
      });
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      const concurrentTask = await findDailyTaskBySlot(rentalId, taskDate, 0);
      if (!concurrentTask) throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
      current = { task: concurrentTask, remainingReplacements: 1 };
    }
  } else {
    recordDailyTaskEvent('daily_task_reused', {
      rentalId,
      taskId: current.task.id,
      templateId: current.task.templateId,
      status: current.task.status
    });
  }

  const [activity, latestSnapshotDate] = await Promise.all([
    getActivitySummary(rentalId, rangeStart, taskDate),
    getLatestSnapshotDate(rentalId)
  ]);
  return {
    task: toTaskDetail(current.task, current.remainingReplacements),
    completedToday: current.task.status === 'COMPLETED',
    activeDays: activity.activeDays,
    latestSnapshotDate
  };
}

/** 原子开始任务；重复调用始终返回第一次开始时间。 */
export async function startDailyTask(
  ownerOpenid: string,
  rentalId: string,
  taskId: string,
  now = new Date()
): Promise<DailyTaskDetail> {
  await assertPublishedOwner(ownerOpenid, rentalId);
  const task = await markTaskStarted(ownerOpenid, rentalId, taskId, now);
  if (!task) throw new AppError(BizCode.DAILY_TASK_NOT_FOUND);
  if (new Date(task.expiresAt).getTime() <= now.getTime() || task.status === 'EXPIRED') {
    throw new AppError(BizCode.DAILY_TASK_EXPIRED);
  }
  if (task.status === 'COMPLETED') throw new AppError(BizCode.DAILY_TASK_ALREADY_COMPLETED);
  if (task.status === 'REPLACED') throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
  recordDailyTaskEvent('daily_task_started', {
    rentalId,
    taskId: task.id,
    templateId: task.templateId,
    status: task.status
  });
  return toTaskDetail(task, task.slot === 0 ? 1 : 0);
}

/** 读取房主指定窗口内的每日观察活跃度。 */
export async function readDailyTaskActivity(
  ownerOpenid: string,
  rentalId: string,
  days = MAX_ACTIVITY_DAYS,
  now = new Date()
): Promise<DailyTaskActivitySummary> {
  await assertPublishedOwner(ownerOpenid, rentalId);
  const safeDays = Math.min(MAX_ACTIVITY_DAYS, Math.max(1, Math.trunc(days)));
  const rangeEnd = getShanghaiDate(now);
  return getActivitySummary(rentalId, shiftDate(rangeEnd, -(safeDays - 1)), rangeEnd);
}
