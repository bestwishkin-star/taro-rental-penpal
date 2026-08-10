import type { HouseModuleId, PhotoCaptureChallenge } from './rental-space';

/** 每日房屋观察任务类型。 */
export type DailyTaskType =
  | 'TIMED_OBSERVATION'
  | 'PHOTO_EVIDENCE'
  | 'QUICK_MEASUREMENT'
  | 'DAILY_EVENT';

/** 任务实例状态；公开审核状态与任务完成状态相互独立。 */
export type DailyTaskStatus = 'ASSIGNED' | 'STARTED' | 'REPLACED' | 'COMPLETED' | 'EXPIRED';

/** 观察内容的公开范围。 */
export type DailyTaskVisibility = 'PRIVATE' | 'PUBLIC';

/** 公开事实投影状态。 */
export type PublicProjectionStatus = 'NOT_REQUESTED' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

/** 用户更换任务时必须选择的私密原因。 */
export type DailyTaskReplacementReason =
  | 'NOT_AT_HOME'
  | 'SPACE_UNAVAILABLE'
  | 'TIME_UNSUITABLE'
  | 'PRIVACY_CONCERN'
  | 'OTHER';

/** 每日任务问题支持的交互控件类型。 */
export type DailyTaskQuestionKind =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'NUMBER'
  | 'SHORT_TEXT';

/** 单个任务问题的可选项。 */
export interface DailyTaskQuestionOption {
  value: string;
  label: string;
}

/** 服务端下发的每日任务问题。 */
export interface DailyTaskQuestion {
  id: string;
  label: string;
  kind: DailyTaskQuestionKind;
  options?: DailyTaskQuestionOption[];
  min?: number;
  max?: number;
  unit?: string;
}

/** 每日任务详情，包含任务执行和公开投影所需的完整状态。 */
export interface DailyTaskDetail {
  id: string;
  rentalId: string;
  taskDate: string;
  module: HouseModuleId;
  type: DailyTaskType;
  status: DailyTaskStatus;
  title: string;
  prompt: string;
  explanation: string;
  estimatedSeconds: number;
  expiresAt: string;
  startedAt?: string;
  requiresPhoto: boolean;
  questions: DailyTaskQuestion[];
  remainingReplacements: number;
  publicProjectionStatus: PublicProjectionStatus;
}

/** 今日任务聚合响应；任务已完成或当天无任务时 task 可以为空。 */
export interface DailyTaskTodayResponse {
  task?: DailyTaskDetail;
  completedToday: boolean;
  activeDays: number;
  latestSnapshotDate?: string;
}

/** 更换每日任务时提交的私密原因，补充说明不会进入公开投影。 */
export interface ReplaceDailyTaskInput {
  reason: DailyTaskReplacementReason;
  note?: string;
}

/** 每日任务问题允许提交的答案值。 */
export type DailyTaskAnswerValue = string | string[] | number;

/** 完成每日任务的输入，幂等键用于避免重复提交产生多条观察。 */
export interface CompleteDailyTaskInput {
  idempotencyKey: string;
  answers: Record<string, DailyTaskAnswerValue>;
  measurementValues: Record<string, number>;
  photoAssetIds: string[];
  challengeId?: string;
  conclusionVisibility: DailyTaskVisibility;
  photoVisibility: DailyTaskVisibility;
  observedAt: string;
}

/** 完成每日任务后的房屋事实更新结果。 */
export interface CompleteDailyTaskResult {
  taskId: string;
  snapshotDate: string;
  updatedModule: HouseModuleId;
  updatedFactKeys: string[];
  freshnessPercent: number;
  publicProjectionStatus: PublicProjectionStatus;
}

/** 指定日期范围内的每日观察活跃度摘要。 */
export interface DailyTaskActivitySummary {
  rangeStart: string;
  rangeEnd: string;
  activeDays: number;
  publicDays: number;
  privateDays: number;
  latestCompletedDate?: string;
  moduleFreshness: Partial<Record<HouseModuleId, string>>;
}

/** 房主可见的单条空间事实。 */
export interface OwnerSpaceFact {
  key: string;
  label: string;
  value: string;
  observedAt: string;
}

/** 房主视角下单个空间模块的当前事实与新鲜度。 */
export interface OwnerSpaceFactSummary {
  module: HouseModuleId;
  freshnessPercent: number;
  facts: OwnerSpaceFact[];
}

/** 复用房屋实录已有的现场拍摄挑战合同。 */
export type DailyTaskPhotoChallenge = PhotoCaptureChallenge;
