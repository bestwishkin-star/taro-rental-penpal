import type {
  DailyTaskAnswerValue,
  DailyTaskActivitySummary,
  DailyTaskReplacementReason,
  DailyTaskStatus,
  DailyTaskVisibility,
  PublicProjectionStatus
} from '@shared/contracts/daily-task';
import {
  HOUSE_MODULE_IDS,
  type HouseModuleId,
  type PhotoHouseholdStatus,
  type PhotoSafetyStatus
} from '@shared/contracts/rental-space';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';
import { generateId } from '@/lib/snowflake';

import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import type {
  DailyTaskCandidateSnapshot,
  DailyTaskIntegrityStatus,
  DailyTaskSelection,
  DailyTaskTemplate,
  RentalTaskObservation
} from './daily-task.types';

/** 房屋所有权与发布状态，未找到的房屋按无所有权处理，避免泄露房屋是否存在。 */
export type OwnedRentalState = 'NOT_OWNED' | 'NOT_PUBLISHED' | 'PUBLISHED';

/** 每日任务实例及其不可变模板版本。 */
export interface DailyTaskRecord {
  id: string;
  rentalId: string;
  ownerOpenid: string;
  taskDate: string;
  slot: number;
  templateId: string;
  templateVersion: number;
  status: DailyTaskStatus;
  assignmentReason: string;
  weightSnapshot: DailyTaskCandidateSnapshot[];
  replacementReason?: string;
  replacementNote?: string;
  parentTaskId?: string;
  startedAt?: string;
  expiresAt: string;
  completedAt?: string;
  publicProjectionStatus: PublicProjectionStatus;
  template?: DailyTaskTemplate;
}

/** 创建任务实例所需的完整选择结果。 */
export interface InsertDailyTaskInput {
  rentalId: string;
  ownerOpenid: string;
  taskDate: string;
  slot: number;
  selection: DailyTaskSelection;
  expiresAt: Date;
  parentTaskId?: string;
}

/** 选择器冷却和空间轮换所需的精简历史。 */
export interface DailyTaskHistoryItem {
  templateId: string;
  templateVersion: number;
  module: HouseModuleId;
  taskDate: string;
}

/** 房屋所有权校验查询返回的数据库行。 */
interface OwnedRentalRow extends RowDataPacket {
  user_openid: string;
  status: number;
  post_status: string | null;
}

/** 每日任务及公开投影状态查询返回的数据库行。 */
interface DailyTaskRow extends RowDataPacket {
  id: string;
  rental_id: string;
  owner_openid: string;
  task_date: string;
  slot: number;
  template_id: string;
  template_version: number;
  status: DailyTaskStatus;
  assignment_reason: string;
  weight_snapshot: string | DailyTaskCandidateSnapshot[];
  replacement_reason: string | null;
  replacement_note: string | null;
  parent_task_id: string | null;
  started_at: Date | string | null;
  expires_at: Date | string;
  completed_at: Date | string | null;
  public_projection_status: PublicProjectionStatus | null;
}

/** 任务选择器所需的历史任务数据库行。 */
interface DailyTaskHistoryRow extends RowDataPacket {
  template_id: string;
  template_version: number;
  module_type: HouseModuleId;
  task_date: string;
}

/** 指定日期窗口内任务活跃度的聚合数据库行。 */
interface ActivitySummaryRow extends RowDataPacket {
  active_days: number | string;
  public_days: number | string;
  private_days: number | string;
  latest_completed_date: string | null;
}

/** 单个空间模块最近观察日期的数据库行。 */
interface ModuleFreshnessRow extends RowDataPacket {
  module_type: HouseModuleId;
  latest_task_date: string;
}

/** 房屋最近公开快照日期的数据库行。 */
interface LatestSnapshotRow extends RowDataPacket {
  latest_snapshot_date: string | null;
}

/** 当前事实头及其指向值的数据库行。 */
interface SpaceFactHeadRow extends RowDataPacket {
  module_type: HouseModuleId;
  fact_key: string;
  fact_label: string;
  normalized_value: string | DailyTaskAnswerValue;
  observed_at: Date | string;
}

/** 不可变观察查询返回的数据库行。 */
interface RentalTaskObservationRow extends RowDataPacket {
  id: string;
  task_id: string;
  rental_id: string;
  owner_openid: string;
  module_type: HouseModuleId;
  task_date: string;
  idempotency_key: string;
  answers: string | RentalTaskObservation['answers'];
  measurement_values: string | RentalTaskObservation['measurementValues'];
  photo_asset_ids: string | string[];
  conclusion_visibility: DailyTaskVisibility;
  photo_visibility: DailyTaskVisibility;
  integrity_status: DailyTaskIntegrityStatus;
  safety_status: PhotoSafetyStatus;
  household_status: PhotoHouseholdStatus;
  public_projection_status: PublicProjectionStatus;
  observed_at: Date | string;
}

/** 每日任务照片证据校验所需的图片资产行。 */
interface TaskPhotoAssetRow extends RowDataPacket {
  id: string;
  content_hash: string;
  upload_source: string;
  safety_status: PhotoSafetyStatus;
  household_status: PhotoHouseholdStatus;
}

/** 查询重复内容哈希时使用的存在性数据库行。 */
interface ReusedPhotoContentRow extends RowDataPacket {
  reused: number;
}

/** 新增不可变事实值所需参数。 */
export interface InsertSpaceFactValueInput {
  rentalId: string;
  module: HouseModuleId;
  key: string;
  label: string;
  value: DailyTaskAnswerValue;
  sourceObservationId: string;
  visibility: DailyTaskVisibility;
  integrityStatus: DailyTaskIntegrityStatus;
  observedAt: string;
}

/** 推进同一房屋空间字段双指针所需参数。 */
export interface UpsertSpaceFactHeadInput {
  rentalId: string;
  module: HouseModuleId;
  key: string;
  ownerFactValueId: string;
  publicFactValueId?: string;
}

/** 房主或公开投影读取的当前字段事实。 */
export interface SpaceFactHeadRecord {
  module: HouseModuleId;
  key: string;
  label: string;
  value: DailyTaskAnswerValue;
  observedAt: string;
}

/** 创建不可变观察时由 Repository 生成主键。 */
export type InsertTaskObservationInput = Omit<RentalTaskObservation, 'id'>;

/** 追加随机任务快照活动所需参数。 */
export interface AppendSnapshotActivityInput {
  snapshotId: string;
  rentalId: string;
  activityDate: string;
  visibility: DailyTaskVisibility;
  module: HouseModuleId;
  taskId: string;
  projectionStatus: PublicProjectionStatus;
}

/** 每日任务照片归属、来源、重复内容和审核聚合结果。 */
export interface TaskPhotoEvidenceState {
  allOwned: boolean;
  allCamera: boolean;
  contentReused: boolean;
  safetyStatus: PhotoSafetyStatus;
  householdStatus: PhotoHouseholdStatus;
}

/** 任务详情查询复用的字段和公开投影关联片段。 */
const TASK_SELECT = `
  SELECT t.id,
         t.rental_id,
         t.owner_openid,
         DATE_FORMAT(t.task_date, '%Y-%m-%d') AS task_date,
         t.slot,
         t.template_id,
         t.template_version,
         t.status,
         t.assignment_reason,
         t.weight_snapshot,
         t.replacement_reason,
         t.replacement_note,
         t.parent_task_id,
         t.started_at,
         t.expires_at,
         t.completed_at,
         COALESCE(o.public_projection_status, 'NOT_REQUESTED') AS public_projection_status
  FROM rental_daily_tasks t
  LEFT JOIN rental_task_observations o ON o.task_id = t.id`;

/** 锁定任务时避免外连接，只读取完成事务所需的任务实例字段。 */
const LOCKING_TASK_SELECT = `
  SELECT t.id,
         t.rental_id,
         t.owner_openid,
         DATE_FORMAT(t.task_date, '%Y-%m-%d') AS task_date,
         t.slot,
         t.template_id,
         t.template_version,
         t.status,
         t.assignment_reason,
         t.weight_snapshot,
         t.replacement_reason,
         t.replacement_note,
         t.parent_task_id,
         t.started_at,
         t.expires_at,
         t.completed_at,
         'NOT_REQUESTED' AS public_projection_status
  FROM rental_daily_tasks t`;

/** 安全解析 JSON 列，损坏的历史快照降级为空候选列表。 */
function parseWeightSnapshot(value: DailyTaskRow['weight_snapshot']): DailyTaskCandidateSnapshot[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as DailyTaskCandidateSnapshot[]) : [];
  } catch {
    return [];
  }
}

/** 将 MySQL DATETIME 统一映射为 API 使用的 ISO 时间。 */
function toIsoString(value: Date | string | null): string | undefined {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

/** 按任务记录绑定代码中仍可用的精确模板版本。 */
function findTemplate(templateId: string, templateVersion: number): DailyTaskTemplate | undefined {
  return DAILY_TASK_TEMPLATES.find(
    (template) => template.id === templateId && template.version === templateVersion
  );
}

/** 将数据库任务行映射为 Service 使用的领域记录。 */
function mapDailyTaskRow(row: DailyTaskRow): DailyTaskRecord {
  return {
    id: row.id,
    rentalId: row.rental_id,
    ownerOpenid: row.owner_openid,
    taskDate: row.task_date,
    slot: row.slot,
    templateId: row.template_id,
    templateVersion: row.template_version,
    status: row.status,
    assignmentReason: row.assignment_reason,
    weightSnapshot: parseWeightSnapshot(row.weight_snapshot),
    replacementReason: row.replacement_reason ?? undefined,
    replacementNote: row.replacement_note ?? undefined,
    parentTaskId: row.parent_task_id ?? undefined,
    startedAt: toIsoString(row.started_at),
    expiresAt: toIsoString(row.expires_at)!,
    completedAt: toIsoString(row.completed_at),
    publicProjectionStatus: row.public_projection_status ?? 'NOT_REQUESTED',
    template: findTemplate(row.template_id, row.template_version)
  };
}

/** 判断数据库中的空间标识是否属于共享合同允许值。 */
function isHouseModuleId(value: string): value is HouseModuleId {
  return HOUSE_MODULE_IDS.some((module) => module === value);
}

/** 安全解析 JSON 事实值，异常数据降级为空字符串供展示层识别。 */
function parseFactValue(value: SpaceFactHeadRow['normalized_value']): DailyTaskAnswerValue {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as DailyTaskAnswerValue;
  } catch {
    return '';
  }
}

/** 将事实头数据库行映射为领域记录。 */
function mapSpaceFactHeadRow(row: SpaceFactHeadRow): SpaceFactHeadRecord {
  return {
    module: row.module_type,
    key: row.fact_key,
    label: row.fact_label,
    value: parseFactValue(row.normalized_value),
    observedAt: new Date(row.observed_at).toISOString()
  };
}

/** 安全解析数据库 JSON 字段，损坏数据使用调用方提供的空值降级。 */
function parseJsonValue<T>(value: string | T, fallback: T): T {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** 将不可变观察数据库行映射为领域记录。 */
function mapTaskObservationRow(row: RentalTaskObservationRow): RentalTaskObservation {
  return {
    id: row.id,
    taskId: row.task_id,
    rentalId: row.rental_id,
    ownerOpenid: row.owner_openid,
    module: row.module_type,
    taskDate: row.task_date,
    idempotencyKey: row.idempotency_key,
    answers: parseJsonValue(row.answers, {}),
    measurementValues: parseJsonValue(row.measurement_values, {}),
    photoAssetIds: parseJsonValue(row.photo_asset_ids, []),
    conclusionVisibility: row.conclusion_visibility,
    photoVisibility: row.photo_visibility,
    integrityStatus: row.integrity_status,
    safetyStatus: row.safety_status,
    householdStatus: row.household_status,
    publicProjectionStatus: row.public_projection_status,
    observedAt: new Date(row.observed_at).toISOString()
  };
}

/** 汇总多张图片的安全状态，明确拒绝优先于人工复核和处理中。 */
function aggregateSafetyStatus(rows: TaskPhotoAssetRow[]): PhotoSafetyStatus {
  if (rows.some((row) => row.safety_status === 'REJECTED')) return 'REJECTED';
  if (rows.some((row) => row.safety_status === 'REVIEW')) return 'REVIEW';
  if (rows.every((row) => row.safety_status === 'PASSED')) return 'PASSED';
  return 'PENDING';
}

/** 汇总多张图片的家庭一致性状态，明确可疑优先于处理中。 */
function aggregateHouseholdStatus(rows: TaskPhotoAssetRow[]): PhotoHouseholdStatus {
  if (rows.some((row) => row.household_status === 'SUSPICIOUS')) return 'SUSPICIOUS';
  if (rows.every((row) => row.household_status === 'CONSISTENT')) return 'CONSISTENT';
  return 'PENDING';
}

/** 区分无所有权与房屋尚未公开，供 Service 映射不同业务错误。 */
export async function getOwnedRentalState(
  ownerOpenid: string,
  rentalId: string
): Promise<OwnedRentalState> {
  const [rows] = await pool.execute<OwnedRentalRow[]>(
    'SELECT user_openid, status, post_status FROM rentals WHERE id = ? LIMIT 1',
    [rentalId]
  );
  const rental = rows[0];
  if (!rental || rental.user_openid !== ownerOpenid) return 'NOT_OWNED';
  if (rental.status !== 1 || (rental.post_status !== null && rental.post_status !== 'active')) {
    return 'NOT_PUBLISHED';
  }
  return 'PUBLISHED';
}

/** 按房屋、上海自然日和槽位读取唯一任务。 */
export async function findDailyTaskBySlot(
  rentalId: string,
  taskDate: string,
  slot: number
): Promise<DailyTaskRecord | null> {
  const [rows] = await pool.execute<DailyTaskRow[]>(
    `${TASK_SELECT}
     WHERE t.rental_id = ? AND t.task_date = ? AND t.slot = ?
     LIMIT 1`,
    [rentalId, taskDate, slot]
  );
  return rows[0] ? mapDailyTaskRow(rows[0]) : null;
}

/** 读取指定日期之前的任务历史，替换掉的任务也参与模板冷却。 */
export async function listRecentTaskHistory(
  rentalId: string,
  beforeTaskDate: string,
  limit = 30
): Promise<DailyTaskHistoryItem[]> {
  // 部分 MySQL 驱动不支持 LIMIT 预处理参数，先约束为整数再写入 SQL。
  const safeLimit = Math.min(90, Math.max(1, Math.trunc(limit)));
  const [rows] = await pool.execute<DailyTaskHistoryRow[]>(
    `SELECT t.template_id,
            t.template_version,
            template.module_type,
            DATE_FORMAT(t.task_date, '%Y-%m-%d') AS task_date
     FROM rental_daily_tasks t
     INNER JOIN rental_daily_task_templates template
       ON template.id = t.template_id AND template.version = t.template_version
     WHERE t.rental_id = ? AND t.task_date < ?
     ORDER BY t.task_date DESC, t.slot DESC
     LIMIT ${safeLimit}`,
    [rentalId, beforeTaskDate]
  );
  return rows.map((row) => ({
    templateId: row.template_id,
    templateVersion: row.template_version,
    module: row.module_type,
    taskDate: row.task_date
  }));
}

/** 保存精确模板版本后插入任务，唯一索引负责并发下的同槽位幂等。 */
export async function insertDailyTask(input: InsertDailyTaskInput): Promise<DailyTaskRecord> {
  const { template } = input.selection;
  await pool.execute(
    `INSERT INTO rental_daily_task_templates
      (id, version, generator_type, generator_version, policy_version, module_type, task_type,
       title, prompt, explanation_template, estimated_seconds, allowed_periods,
       evidence_requirement, question_schema, fact_mapping, cooldown_days, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      template.id,
      template.version,
      template.generatorType,
      template.generatorVersion,
      template.policyVersion,
      template.module,
      template.type,
      template.title,
      template.prompt,
      template.explanation,
      template.estimatedSeconds,
      JSON.stringify(template.allowedPeriods),
      JSON.stringify(template.evidenceRequirement),
      JSON.stringify(template.questionSchema),
      JSON.stringify(template.factMapping),
      template.cooldownDays,
      template.active ? 1 : 0
    ]
  );

  const id = generateId();
  await pool.execute<ResultSetHeader>(
    `INSERT INTO rental_daily_tasks
      (id, rental_id, owner_openid, task_date, slot, template_id, template_version, status,
       assignment_reason, weight_snapshot, parent_task_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?, ?, ?)`,
    [
      id,
      input.rentalId,
      input.ownerOpenid,
      input.taskDate,
      input.slot,
      template.id,
      template.version,
      input.selection.assignmentReason,
      JSON.stringify(input.selection.candidates),
      input.parentTaskId ?? null,
      input.expiresAt
    ]
  );

  const task = await findDailyTaskBySlot(input.rentalId, input.taskDate, input.slot);
  if (!task) throw new Error('每日任务写入后无法回读');
  return task;
}

/** 首次开始时原子写入 started_at，重复调用始终保留第一次时间。 */
export async function markTaskStarted(
  ownerOpenid: string,
  rentalId: string,
  taskId: string,
  startedAt: Date
): Promise<DailyTaskRecord | null> {
  await pool.execute<ResultSetHeader>(
    `UPDATE rental_daily_tasks
     SET started_at = COALESCE(started_at, ?),
         status = CASE WHEN status = 'ASSIGNED' THEN 'STARTED' ELSE status END
     WHERE id = ?
       AND rental_id = ?
       AND owner_openid = ?
       AND expires_at > ?
       AND status IN ('ASSIGNED', 'STARTED')`,
    [startedAt, taskId, rentalId, ownerOpenid, startedAt]
  );
  const [rows] = await pool.execute<DailyTaskRow[]>(
    `${TASK_SELECT}
     WHERE t.id = ? AND t.rental_id = ? AND t.owner_openid = ?
     LIMIT 1`,
    [taskId, rentalId, ownerOpenid]
  );
  return rows[0] ? mapDailyTaskRow(rows[0]) : null;
}

/** 汇总闭区间内的任务活跃天数、公开选择、私密选择和空间最近观察日。 */
export async function getActivitySummary(
  rentalId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<DailyTaskActivitySummary> {
  const [summaryRows] = await pool.execute<ActivitySummaryRow[]>(
    `SELECT COUNT(DISTINCT task_date) AS active_days,
            COUNT(DISTINCT CASE WHEN conclusion_visibility = 'PUBLIC' THEN task_date END) AS public_days,
            COUNT(DISTINCT CASE WHEN conclusion_visibility = 'PRIVATE' THEN task_date END) AS private_days,
            DATE_FORMAT(MAX(task_date), '%Y-%m-%d') AS latest_completed_date
     FROM rental_task_observations
     WHERE rental_id = ? AND task_date BETWEEN ? AND ?`,
    [rentalId, rangeStart, rangeEnd]
  );
  const [freshnessRows] = await pool.execute<ModuleFreshnessRow[]>(
    `SELECT module_type,
            DATE_FORMAT(MAX(task_date), '%Y-%m-%d') AS latest_task_date
     FROM rental_task_observations
     WHERE rental_id = ? AND task_date BETWEEN ? AND ?
     GROUP BY module_type`,
    [rentalId, rangeStart, rangeEnd]
  );

  const summary = summaryRows[0];
  const moduleFreshness: Partial<Record<HouseModuleId, string>> = {};
  for (const row of freshnessRows) {
    if (isHouseModuleId(row.module_type)) moduleFreshness[row.module_type] = row.latest_task_date;
  }
  return {
    rangeStart,
    rangeEnd,
    activeDays: Number(summary?.active_days ?? 0),
    publicDays: Number(summary?.public_days ?? 0),
    privateDays: Number(summary?.private_days ?? 0),
    latestCompletedDate: summary?.latest_completed_date ?? undefined,
    moduleFreshness
  };
}

/** 读取当前房屋最新公开快照的上海自然日。 */
export async function getLatestSnapshotDate(rentalId: string): Promise<string | undefined> {
  const [rows] = await pool.execute<LatestSnapshotRow[]>(
    `SELECT DATE_FORMAT(MAX(snapshot_date), '%Y-%m-%d') AS latest_snapshot_date
     FROM rental_public_snapshots
     WHERE rental_id = ?`,
    [rentalId]
  );
  return rows[0]?.latest_snapshot_date ?? undefined;
}

/** 在调用方事务中追加一条不可变事实值并返回其主键。 */
export async function insertSpaceFactValue(
  connection: PoolConnection,
  input: InsertSpaceFactValueInput
): Promise<string> {
  const id = generateId();
  await connection.execute<ResultSetHeader>(
    `INSERT INTO rental_space_fact_values
      (id, rental_id, module_type, fact_key, fact_label, normalized_value,
       source_observation_id, visibility, integrity_status, observed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.rentalId,
      input.module,
      input.key,
      input.label,
      JSON.stringify(input.value),
      input.sourceObservationId,
      input.visibility,
      input.integrityStatus,
      new Date(input.observedAt)
    ]
  );
  return id;
}

/** 原子推进房主事实头，并仅在明确传入公开值时推进公开事实头。 */
export async function upsertSpaceFactHead(
  connection: PoolConnection,
  input: UpsertSpaceFactHeadInput
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `INSERT INTO rental_space_fact_heads
      (rental_id, module_type, fact_key, owner_fact_value_id, public_fact_value_id)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       owner_fact_value_id = VALUES(owner_fact_value_id),
       public_fact_value_id = COALESCE(VALUES(public_fact_value_id), public_fact_value_id)`,
    [
      input.rentalId,
      input.module,
      input.key,
      input.ownerFactValueId,
      input.publicFactValueId ?? null
    ]
  );
}

/** 读取指定房屋所有 owner head 当前事实，不包含原始答案和照片。 */
export async function listOwnerSpaceFactHeads(rentalId: string): Promise<SpaceFactHeadRecord[]> {
  const [rows] = await pool.execute<SpaceFactHeadRow[]>(
    `SELECT value.module_type,
            value.fact_key,
            value.fact_label,
            value.normalized_value,
            value.observed_at
     FROM rental_space_fact_heads head
     INNER JOIN rental_space_fact_values value ON value.id = head.owner_fact_value_id
     WHERE head.rental_id = ?
     ORDER BY value.module_type, value.fact_key`,
    [rentalId]
  );
  return rows.map(mapSpaceFactHeadRow);
}

/** 在调用方事务中读取公开事实头，供同日快照重建使用。 */
export async function listPublicSpaceFactHeadsWithConnection(
  connection: PoolConnection,
  rentalId: string
): Promise<SpaceFactHeadRecord[]> {
  const [rows] = await connection.execute<SpaceFactHeadRow[]>(
    `SELECT value.module_type,
            value.fact_key,
            value.fact_label,
            value.normalized_value,
            value.observed_at
     FROM rental_space_fact_heads head
     INNER JOIN rental_space_fact_values value ON value.id = head.public_fact_value_id
     WHERE head.rental_id = ?
     ORDER BY value.module_type, value.fact_key`,
    [rentalId]
  );
  return rows.map(mapSpaceFactHeadRow);
}

/** 在事务中锁定指定房主的任务实例，避免并发完成产生重复观察。 */
export async function lockDailyTask(
  connection: PoolConnection,
  ownerOpenid: string,
  rentalId: string,
  taskId: string
): Promise<DailyTaskRecord | null> {
  const [rows] = await connection.execute<DailyTaskRow[]>(
    `${LOCKING_TASK_SELECT}
     WHERE t.id = ? AND t.rental_id = ? AND t.owner_openid = ?
     LIMIT 1
     FOR UPDATE`,
    [taskId, rentalId, ownerOpenid]
  );
  return rows[0] ? mapDailyTaskRow(rows[0]) : null;
}

/** 在事务外快速回读同一房主的幂等完成记录。 */
export async function findObservationByIdempotencyKey(
  ownerOpenid: string,
  idempotencyKey: string
): Promise<RentalTaskObservation | null> {
  const [rows] = await pool.execute<RentalTaskObservationRow[]>(
    `SELECT id, task_id, rental_id, owner_openid, module_type,
            DATE_FORMAT(task_date, '%Y-%m-%d') AS task_date,
            idempotency_key, answers, measurement_values, photo_asset_ids,
            conclusion_visibility, photo_visibility, integrity_status, safety_status,
            household_status, public_projection_status, observed_at
     FROM rental_task_observations
     WHERE owner_openid = ? AND idempotency_key = ?
     LIMIT 1`,
    [ownerOpenid, idempotencyKey]
  );
  return rows[0] ? mapTaskObservationRow(rows[0]) : null;
}

/** 在调用方事务中按幂等键锁定既有观察。 */
export async function findObservationByIdempotencyKeyWithConnection(
  connection: PoolConnection,
  ownerOpenid: string,
  idempotencyKey: string
): Promise<RentalTaskObservation | null> {
  const [rows] = await connection.execute<RentalTaskObservationRow[]>(
    `SELECT id, task_id, rental_id, owner_openid, module_type,
            DATE_FORMAT(task_date, '%Y-%m-%d') AS task_date,
            idempotency_key, answers, measurement_values, photo_asset_ids,
            conclusion_visibility, photo_visibility, integrity_status, safety_status,
            household_status, public_projection_status, observed_at
     FROM rental_task_observations
     WHERE owner_openid = ? AND idempotency_key = ?
     LIMIT 1
     FOR UPDATE`,
    [ownerOpenid, idempotencyKey]
  );
  return rows[0] ? mapTaskObservationRow(rows[0]) : null;
}

/** 在调用方事务中按任务读取唯一观察，处理已完成任务的重复请求。 */
export async function findObservationByTaskIdWithConnection(
  connection: PoolConnection,
  taskId: string
): Promise<RentalTaskObservation | null> {
  const [rows] = await connection.execute<RentalTaskObservationRow[]>(
    `SELECT id, task_id, rental_id, owner_openid, module_type,
            DATE_FORMAT(task_date, '%Y-%m-%d') AS task_date,
            idempotency_key, answers, measurement_values, photo_asset_ids,
            conclusion_visibility, photo_visibility, integrity_status, safety_status,
            household_status, public_projection_status, observed_at
     FROM rental_task_observations
     WHERE task_id = ?
     LIMIT 1
     FOR UPDATE`,
    [taskId]
  );
  return rows[0] ? mapTaskObservationRow(rows[0]) : null;
}

/** 在调用方事务中写入不可变观察，所有 DATETIME 参数使用 Date 对象。 */
export async function insertImmutableObservation(
  connection: PoolConnection,
  input: InsertTaskObservationInput
): Promise<RentalTaskObservation> {
  const id = generateId();
  await connection.execute<ResultSetHeader>(
    `INSERT INTO rental_task_observations
      (id, task_id, rental_id, owner_openid, module_type, task_date, idempotency_key,
       answers, measurement_values, photo_asset_ids, conclusion_visibility, photo_visibility,
       integrity_status, safety_status, household_status, public_projection_status, observed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.taskId,
      input.rentalId,
      input.ownerOpenid,
      input.module,
      input.taskDate,
      input.idempotencyKey,
      JSON.stringify(input.answers),
      JSON.stringify(input.measurementValues),
      JSON.stringify(input.photoAssetIds),
      input.conclusionVisibility,
      input.photoVisibility,
      input.integrityStatus,
      input.safetyStatus,
      input.householdStatus,
      input.publicProjectionStatus,
      new Date(input.observedAt)
    ]
  );
  return { id, ...input };
}

/** 在调用方事务中追加一次快照活动，任务唯一索引避免重复节点来源。 */
export async function appendSnapshotActivity(
  connection: PoolConnection,
  input: AppendSnapshotActivityInput
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    `INSERT INTO rental_snapshot_activities
      (id, snapshot_id, rental_id, activity_date, source, visibility,
       module_type, task_id, projection_status)
     VALUES (?, ?, ?, ?, 'RANDOM_TASK', ?, ?, ?, ?)`,
    [
      generateId(),
      input.snapshotId,
      input.rentalId,
      input.activityDate,
      input.visibility,
      input.module,
      input.taskId,
      input.projectionStatus
    ]
  );
}

/** 将已锁定任务原子标记为完成，仅 STARTED 状态允许推进。 */
export async function markTaskCompleted(
  connection: PoolConnection,
  taskId: string,
  completedAt: Date
): Promise<boolean> {
  const [result] = await connection.execute<ResultSetHeader>(
    `UPDATE rental_daily_tasks
     SET status = 'COMPLETED', completed_at = ?
     WHERE id = ? AND status = 'STARTED'`,
    [completedAt, taskId]
  );
  return result.affectedRows === 1;
}

/** 按主键读取指定房主的每日任务，供拍摄挑战签发前校验。 */
export async function findDailyTaskById(
  ownerOpenid: string,
  rentalId: string,
  taskId: string
): Promise<DailyTaskRecord | null> {
  const [rows] = await pool.execute<DailyTaskRow[]>(
    `${TASK_SELECT}
     WHERE t.id = ? AND t.rental_id = ? AND t.owner_openid = ?
     LIMIT 1`,
    [taskId, rentalId, ownerOpenid]
  );
  return rows[0] ? mapDailyTaskRow(rows[0]) : null;
}

/** 在调用方事务中读取房屋、日期和槽位唯一任务。 */
export async function findDailyTaskBySlotWithConnection(
  connection: PoolConnection,
  rentalId: string,
  taskDate: string,
  slot: number
): Promise<DailyTaskRecord | null> {
  const [rows] = await connection.execute<DailyTaskRow[]>(
    `${TASK_SELECT}
     WHERE t.rental_id = ? AND t.task_date = ? AND t.slot = ?
     LIMIT 1`,
    [rentalId, taskDate, slot]
  );
  return rows[0] ? mapDailyTaskRow(rows[0]) : null;
}

/** 在调用方事务中保存模板版本并创建替换任务。 */
export async function insertDailyTaskWithConnection(
  connection: PoolConnection,
  input: InsertDailyTaskInput
): Promise<DailyTaskRecord> {
  const { template } = input.selection;
  await connection.execute(
    `INSERT INTO rental_daily_task_templates
      (id, version, generator_type, generator_version, policy_version, module_type, task_type,
       title, prompt, explanation_template, estimated_seconds, allowed_periods,
       evidence_requirement, question_schema, fact_mapping, cooldown_days, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      template.id,
      template.version,
      template.generatorType,
      template.generatorVersion,
      template.policyVersion,
      template.module,
      template.type,
      template.title,
      template.prompt,
      template.explanation,
      template.estimatedSeconds,
      JSON.stringify(template.allowedPeriods),
      JSON.stringify(template.evidenceRequirement),
      JSON.stringify(template.questionSchema),
      JSON.stringify(template.factMapping),
      template.cooldownDays,
      template.active ? 1 : 0
    ]
  );

  const id = generateId();
  await connection.execute<ResultSetHeader>(
    `INSERT INTO rental_daily_tasks
      (id, rental_id, owner_openid, task_date, slot, template_id, template_version, status,
       assignment_reason, weight_snapshot, parent_task_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?, ?, ?)`,
    [
      id,
      input.rentalId,
      input.ownerOpenid,
      input.taskDate,
      input.slot,
      template.id,
      template.version,
      input.selection.assignmentReason,
      JSON.stringify(input.selection.candidates),
      input.parentTaskId ?? null,
      input.expiresAt
    ]
  );
  const task = await findDailyTaskBySlotWithConnection(
    connection,
    input.rentalId,
    input.taskDate,
    input.slot
  );
  if (!task) throw new Error('替换任务写入后无法回读');
  return task;
}

/** 将仅处于 ASSIGNED 的原始任务标记为已替换并保存私密原因。 */
export async function markTaskReplaced(
  connection: PoolConnection,
  taskId: string,
  reason: DailyTaskReplacementReason,
  note?: string
): Promise<boolean> {
  const [result] = await connection.execute<ResultSetHeader>(
    `UPDATE rental_daily_tasks
     SET status = 'REPLACED', replacement_reason = ?, replacement_note = ?
     WHERE id = ? AND slot = 0 AND status = 'ASSIGNED'`,
    [reason, note ?? null, taskId]
  );
  return result.affectedRows === 1;
}

/** 校验照片归属、现场来源和内容哈希是否已用于其他每日观察。 */
export async function inspectTaskPhotoEvidence(
  connection: PoolConnection,
  ownerOpenid: string,
  taskId: string,
  photoAssetIds: string[]
): Promise<TaskPhotoEvidenceState> {
  const uniqueAssetIds = [...new Set(photoAssetIds)];
  if (uniqueAssetIds.length === 0) {
    return {
      allOwned: true,
      allCamera: true,
      contentReused: false,
      safetyStatus: 'UNCHECKED',
      householdStatus: 'UNCHECKED'
    };
  }

  const placeholders = uniqueAssetIds.map(() => '?').join(', ');
  const [assets] = await connection.execute<TaskPhotoAssetRow[]>(
    `SELECT id, content_hash, upload_source, safety_status, household_status
     FROM photo_assets
     WHERE owner_openid = ? AND id IN (${placeholders})
     FOR UPDATE`,
    [ownerOpenid, ...uniqueAssetIds]
  );
  const allOwned = assets.length === uniqueAssetIds.length && uniqueAssetIds.length === photoAssetIds.length;
  if (!allOwned) {
    return {
      allOwned: false,
      allCamera: false,
      contentReused: false,
      safetyStatus: 'UNCHECKED',
      householdStatus: 'UNCHECKED'
    };
  }

  const hashPlaceholders = assets.map(() => '?').join(', ');
  const [reusedRows] = await connection.execute<ReusedPhotoContentRow[]>(
    `SELECT 1 AS reused
     FROM rental_task_observations observation
     INNER JOIN photo_assets used_asset
       ON used_asset.owner_openid = observation.owner_openid
      AND JSON_CONTAINS(observation.photo_asset_ids, JSON_QUOTE(used_asset.id))
     WHERE observation.owner_openid = ?
       AND observation.task_id <> ?
       AND used_asset.content_hash IN (${hashPlaceholders})
     LIMIT 1`,
    [ownerOpenid, taskId, ...assets.map((asset) => asset.content_hash)]
  );
  return {
    allOwned: true,
    allCamera: assets.every((asset) => asset.upload_source === 'CAMERA'),
    contentReused:
      reusedRows.length > 0 ||
      new Set(assets.map((asset) => asset.content_hash)).size !== assets.length,
    safetyStatus: aggregateSafetyStatus(assets),
    householdStatus: aggregateHouseholdStatus(assets)
  };
}

/** 在同一完成事务中同步观察记录的公开投影状态。 */
export async function updateObservationProjectionStatus(
  connection: PoolConnection,
  observationId: string,
  status: PublicProjectionStatus
): Promise<void> {
  await connection.execute<ResultSetHeader>(
    'UPDATE rental_task_observations SET public_projection_status = ? WHERE id = ?',
    [status, observationId]
  );
}
