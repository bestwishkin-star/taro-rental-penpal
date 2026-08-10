import type {
  CompleteDailyTaskInput,
  CompleteDailyTaskResult,
  DailyTaskActivitySummary,
  DailyTaskDetail,
  DailyTaskTodayResponse,
  PublicProjectionStatus
} from '@shared/contracts/daily-task';
import { BizCode } from '@shared/errors';
import { z } from 'zod';

import { AppError } from '@/lib/errors';
import { pool } from '@/lib/mysql';
import { getShanghaiDate } from '@/modules/house-records/house-record-date';

import { recordDailyTaskEvent } from './daily-task-events';
import {
  appendSnapshotActivity,
  findDailyTaskBySlot,
  findObservationByIdempotencyKeyWithConnection,
  findObservationByTaskIdWithConnection,
  getActivitySummary,
  getLatestSnapshotDate,
  getOwnedRentalState,
  insertDailyTask,
  insertImmutableObservation,
  listRecentTaskHistory,
  lockDailyTask,
  markTaskCompleted,
  markTaskStarted,
  type DailyTaskHistoryItem,
  type DailyTaskRecord
} from './daily-task.repository';
import { projectObservation, readOwnerSpaceFacts } from './daily-task-projection.service';
import { selectDailyTaskTemplate } from './daily-task.selector';
import { replaceSnapshotFromPublicFactsWithConnection } from './daily-task-snapshot.service';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import type {
  DailyTaskPeriod,
  DailyTaskTemplate,
  RentalTaskObservation
} from './daily-task.types';

/** 每日任务活跃度接口允许查询的最大天数。 */
const MAX_ACTIVITY_DAYS = 30;

/** 客户端观察时间允许领先服务端时钟的最大误差。 */
const MAX_OBSERVED_AT_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** 每日任务单个答案支持的结构化值。 */
const DAILY_TASK_ANSWER_VALUE_SCHEMA = z.union([
  z.string().max(500),
  z.array(z.string().max(120)).min(1).max(12),
  z.number().finite()
]);

/** 完成任务接口的严格输入结构，拒绝客户端注入派生事实字段。 */
const COMPLETE_DAILY_TASK_SCHEMA = z
  .object({
    idempotencyKey: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
    answers: z.record(DAILY_TASK_ANSWER_VALUE_SCHEMA),
    measurementValues: z.record(z.number().finite()),
    photoAssetIds: z.array(z.string().min(1).max(64)).max(6),
    challengeId: z.string().min(1).max(64).optional(),
    conclusionVisibility: z.enum(['PRIVATE', 'PUBLIC']),
    photoVisibility: z.enum(['PRIVATE', 'PUBLIC']),
    observedAt: z.string().datetime({ offset: true })
  })
  .strict();

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

/** 严格解析完成任务输入，并收敛为共享合同类型。 */
function parseCompleteDailyTaskInput(input: unknown): CompleteDailyTaskInput {
  const result = COMPLETE_DAILY_TASK_SCHEMA.safeParse(input);
  if (!result.success) throw new AppError(BizCode.INVALID_PARAMS);
  return result.data;
}

/** 计算观察在写入时应使用的初始公开投影状态。 */
function getInitialProjectionStatus(
  input: CompleteDailyTaskInput,
  template: DailyTaskTemplate
): PublicProjectionStatus {
  if (input.conclusionVisibility === 'PRIVATE') return 'NOT_REQUESTED';
  return template.evidenceRequirement.requiresPhoto ? 'PENDING' : 'PUBLISHED';
}

/** 校验任务状态、上海自然日、有效期、计时时长和基础证据要求。 */
function assertTaskCanComplete(
  task: DailyTaskRecord,
  template: DailyTaskTemplate,
  input: CompleteDailyTaskInput,
  now: Date
): void {
  if (task.status === 'EXPIRED' || new Date(task.expiresAt).getTime() <= now.getTime()) {
    throw new AppError(BizCode.DAILY_TASK_EXPIRED);
  }
  if (task.status === 'ASSIGNED' || !task.startedAt) {
    throw new AppError(BizCode.DAILY_TASK_NOT_STARTED);
  }
  if (task.status !== 'STARTED') throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
  if (task.taskDate !== getShanghaiDate(now)) throw new AppError(BizCode.DAILY_TASK_EXPIRED);

  const startedAt = new Date(task.startedAt);
  const elapsedSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  if (elapsedSeconds < template.minimumDurationSeconds) {
    throw new AppError(BizCode.TASK_TIMER_TOO_SHORT);
  }

  const observedAt = new Date(input.observedAt);
  if (
    getShanghaiDate(observedAt) !== task.taskDate ||
    observedAt.getTime() < startedAt.getTime() - MAX_OBSERVED_AT_CLOCK_SKEW_MS ||
    observedAt.getTime() > now.getTime() + MAX_OBSERVED_AT_CLOCK_SKEW_MS
  ) {
    throw new AppError(BizCode.INVALID_PARAMS);
  }
  if (template.evidenceRequirement.requiresPhoto && input.photoAssetIds.length === 0) {
    throw new AppError(BizCode.TASK_EVIDENCE_REQUIRED);
  }
}

/** 读取指定空间完成后的房主事实新鲜度。 */
async function readCompletedModuleFreshness(
  ownerOpenid: string,
  rentalId: string,
  module: RentalTaskObservation['module']
): Promise<number> {
  const summaries = await readOwnerSpaceFacts(ownerOpenid, rentalId);
  return summaries.find((summary) => summary.module === module)?.freshnessPercent ?? 0;
}

/** 在单一事务中完成任务、写观察、推进事实并重建当日快照。 */
export async function completeDailyTask(
  ownerOpenid: string,
  rentalId: string,
  taskId: string,
  rawInput: unknown,
  now = new Date()
): Promise<CompleteDailyTaskResult> {
  const input = parseCompleteDailyTaskInput(rawInput);
  await assertPublishedOwner(ownerOpenid, rentalId);
  const connection = await pool.getConnection();
  let completedObservation: RentalTaskObservation | null = null;
  let updatedFactKeys: string[] = [];

  try {
    await connection.beginTransaction();
    const task = await lockDailyTask(connection, ownerOpenid, rentalId, taskId);
    if (!task) throw new AppError(BizCode.DAILY_TASK_NOT_FOUND);
    const template = task.template ?? findTemplate(task.templateId, task.templateVersion);
    if (!template) throw new AppError(BizCode.TASK_TEMPLATE_VERSION_UNAVAILABLE);

    // 在任务锁内再次读取幂等键，保证并发重试不会插入第二条观察。
    const idempotentObservation = await findObservationByIdempotencyKeyWithConnection(
      connection,
      ownerOpenid,
      input.idempotencyKey
    );
    if (idempotentObservation) {
      if (
        idempotentObservation.taskId !== taskId ||
        idempotentObservation.rentalId !== rentalId
      ) {
        throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
      }
      completedObservation = idempotentObservation;
      updatedFactKeys = template.factMapping.map((mapping) => mapping.factKey);
      await connection.commit();
    } else {
      if (task.status === 'COMPLETED') {
        await findObservationByTaskIdWithConnection(connection, task.id);
        throw new AppError(BizCode.DAILY_TASK_ALREADY_COMPLETED);
      }
      assertTaskCanComplete(task, template, input, now);

      const hasPhotos = input.photoAssetIds.length > 0;
      const initialProjectionStatus = getInitialProjectionStatus(input, template);
      const observation = await insertImmutableObservation(connection, {
        taskId: task.id,
        rentalId: task.rentalId,
        ownerOpenid: task.ownerOpenid,
        module: template.module,
        taskDate: task.taskDate,
        idempotencyKey: input.idempotencyKey,
        answers: input.answers,
        measurementValues: input.measurementValues,
        photoAssetIds: input.photoAssetIds,
        conclusionVisibility: input.conclusionVisibility,
        photoVisibility: input.photoVisibility,
        integrityStatus: 'PASSED',
        safetyStatus: hasPhotos ? 'PENDING' : 'UNCHECKED',
        householdStatus: hasPhotos ? 'PENDING' : 'UNCHECKED',
        publicProjectionStatus: initialProjectionStatus,
        observedAt: input.observedAt
      });
      const projection = await projectObservation(observation, template, connection);
      const snapshot = await replaceSnapshotFromPublicFactsWithConnection(connection, {
        rentalId: task.rentalId,
        ownerOpenid: task.ownerOpenid,
        snapshotDate: task.taskDate,
        source: 'RANDOM_TASK'
      });
      await appendSnapshotActivity(connection, {
        snapshotId: snapshot.snapshotId,
        rentalId: task.rentalId,
        activityDate: task.taskDate,
        visibility: input.conclusionVisibility,
        module: template.module,
        taskId: task.id,
        projectionStatus: projection.publicProjectionStatus
      });
      const completed = await markTaskCompleted(connection, task.id, now);
      if (!completed) throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);

      await connection.commit();
      completedObservation = {
        ...observation,
        publicProjectionStatus: projection.publicProjectionStatus
      };
      updatedFactKeys = projection.ownerFactKeys;
      recordDailyTaskEvent('daily_task_completed', {
        rentalId,
        taskId,
        templateId: template.id,
        factCount: updatedFactKeys.length,
        status: 'COMPLETED'
      });
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  if (!completedObservation) {
    throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
  }
  const freshnessPercent = await readCompletedModuleFreshness(
    ownerOpenid,
    rentalId,
    completedObservation.module
  );
  return {
    taskId: completedObservation.taskId,
    snapshotDate: completedObservation.taskDate,
    updatedModule: completedObservation.module,
    updatedFactKeys,
    freshnessPercent,
    publicProjectionStatus: completedObservation.publicProjectionStatus
  };
}
