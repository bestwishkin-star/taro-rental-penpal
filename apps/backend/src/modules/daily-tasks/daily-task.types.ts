import type { DailyTaskQuestion, DailyTaskType } from '@shared/contracts/daily-task';
import type { HouseModuleId } from '@shared/contracts/rental-space';

/** 每日任务可执行的粗粒度时段，避免记录用户精确作息。 */
export type DailyTaskPeriod = 'MORNING' | 'DAYTIME' | 'EVENING' | 'LATE_NIGHT';

/** 模板生成来源；首期仅启用规则模板，保留未来 AI 版本兼容位。 */
export type DailyTaskGeneratorType = 'RULE' | 'AI';

/** 任务完成时必须满足的现场证据要求。 */
export interface DailyTaskEvidenceRequirement {
  requiresPhoto: boolean;
  requiresCaptureChallenge: boolean;
}

/** 题目答案或测量值到房屋事实字段的稳定映射。 */
export interface DailyTaskFactMapping {
  sourceKey: string;
  factKey: string;
  factLabel: string;
  source?: 'ANSWER' | 'MEASUREMENT';
}

/** 可长期演进且能够重放历史任务的版本化规则模板。 */
export interface DailyTaskTemplate {
  id: string;
  version: number;
  generatorType: DailyTaskGeneratorType;
  generatorVersion: string;
  policyVersion: string;
  module: HouseModuleId;
  type: DailyTaskType;
  dimension: string;
  title: string;
  prompt: string;
  explanation: string;
  estimatedSeconds: number;
  minimumDurationSeconds: number;
  allowedPeriods: readonly DailyTaskPeriod[];
  evidenceRequirement: DailyTaskEvidenceRequirement;
  questionSchema: readonly DailyTaskQuestion[];
  factMapping: readonly DailyTaskFactMapping[];
  cooldownDays: number;
  active: boolean;
}

/** 选择器所需的完整上下文，不依赖数据库、时钟或随机全局状态。 */
export interface SelectDailyTaskInput {
  templates: readonly DailyTaskTemplate[];
  taskDate: string;
  period: DailyTaskPeriod;
  recentTemplateIds: readonly string[];
  recentModules: readonly HouseModuleId[];
  staleDaysByFact: Readonly<Record<string, number>>;
  excludedDimension?: string;
  seed: string;
}

/** 单个合格候选的可持久化权重快照。 */
export interface DailyTaskCandidateSnapshot {
  templateId: string;
  templateVersion: number;
  module: HouseModuleId;
  type: DailyTaskType;
  dimension: string;
  weight: number;
  reasons: string[];
}

/** 一次确定性选择的结果及其完整候选依据。 */
export interface DailyTaskSelection {
  template: DailyTaskTemplate;
  assignmentReason: string;
  candidates: DailyTaskCandidateSnapshot[];
}
