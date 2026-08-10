import type {
  DailyTaskAnswerValue,
  DailyTaskQuestion,
  OwnerSpaceFactSummary,
  PublicProjectionStatus
} from '@shared/contracts/daily-task';
import { HOUSE_MODULE_IDS } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';
import type { PoolConnection } from 'mysql2/promise';

import { AppError } from '@/lib/errors';

import {
  getOwnedRentalState,
  insertSpaceFactValue,
  listOwnerSpaceFactHeads,
  upsertSpaceFactHead
} from './daily-task.repository';
import type {
  DailyTaskTemplate,
  NormalizedFactValue,
  RentalTaskObservation
} from './daily-task.types';

/** 字段新鲜度从满值线性衰减到零所需的天数。 */
const FACT_FRESHNESS_WINDOW_DAYS = 30;

/** 单次观察投影后实际推进的房主与公开事实键。 */
export interface ProjectObservationResult {
  ownerFactKeys: string[];
  publicFactKeys: string[];
  publicProjectionStatus: PublicProjectionStatus;
}

/** 判断提交值是否属于问题声明的稳定选项。 */
function isAllowedOption(question: DailyTaskQuestion, value: string): boolean {
  return question.options?.some((option) => option.value === value) ?? false;
}

/** 按模板问题类型校验并归一化单个答案。 */
function normalizeAnswer(
  question: DailyTaskQuestion,
  rawValue: DailyTaskAnswerValue | undefined
): DailyTaskAnswerValue {
  if (question.kind === 'SINGLE_CHOICE') {
    if (typeof rawValue !== 'string' || !isAllowedOption(question, rawValue)) {
      throw new AppError(BizCode.INVALID_PARAMS);
    }
    return rawValue;
  }

  if (question.kind === 'MULTIPLE_CHOICE') {
    if (
      !Array.isArray(rawValue) ||
      rawValue.length === 0 ||
      rawValue.some((value) => typeof value !== 'string' || !isAllowedOption(question, value))
    ) {
      throw new AppError(BizCode.INVALID_PARAMS);
    }
    return [...new Set(rawValue)];
  }

  if (question.kind === 'NUMBER') {
    if (
      typeof rawValue !== 'number' ||
      !Number.isFinite(rawValue) ||
      (question.min !== undefined && rawValue < question.min) ||
      (question.max !== undefined && rawValue > question.max)
    ) {
      throw new AppError(BizCode.INVALID_PARAMS);
    }
    return rawValue;
  }

  if (typeof rawValue !== 'string') throw new AppError(BizCode.INVALID_PARAMS);
  const normalizedText = rawValue.trim();
  if (!normalizedText || normalizedText.length > 500) {
    throw new AppError(BizCode.INVALID_PARAMS);
  }
  return normalizedText;
}

/** 根据隐私选择和证据审核状态确定公开事实是否可以推进。 */
function resolvePublicProjectionStatus(
  observation: RentalTaskObservation,
  template: DailyTaskTemplate
): PublicProjectionStatus {
  if (observation.conclusionVisibility === 'PRIVATE') return 'NOT_REQUESTED';
  if (
    observation.integrityStatus === 'REJECTED' ||
    observation.safetyStatus === 'REJECTED' ||
    observation.householdStatus === 'SUSPICIOUS'
  ) {
    return 'REJECTED';
  }
  if (observation.integrityStatus !== 'PASSED') return 'PENDING';
  if (!template.evidenceRequirement.requiresPhoto) return 'PUBLISHED';
  return observation.safetyStatus === 'PASSED' &&
    observation.householdStatus === 'CONSISTENT'
    ? 'PUBLISHED'
    : 'PENDING';
}

/** 校验观察中模板声明的全部题目，未声明的客户端字段不会参与投影。 */
export function validateObservationAnswers(
  observation: RentalTaskObservation,
  template: DailyTaskTemplate
): void {
  for (const question of template.questionSchema) {
    const mapping = template.factMapping.find((item) => item.sourceKey === question.id);
    const source = mapping?.source === 'MEASUREMENT'
      ? observation.measurementValues
      : observation.answers;
    normalizeAnswer(question, source[question.id]);
  }
}

/** 将观察限制在模板声明的字段映射白名单内并验证答案范围。 */
export function mapObservationToFacts(
  observation: RentalTaskObservation,
  template: DailyTaskTemplate
): NormalizedFactValue[] {
  if (observation.module !== template.module) {
    throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
  }
  validateObservationAnswers(observation, template);

  return template.factMapping.map((mapping) => {
    const question = template.questionSchema.find((item) => item.id === mapping.sourceKey);
    if (!question || !mapping.factKey.startsWith(`${template.module}.`)) {
      throw new AppError(BizCode.TASK_TEMPLATE_VERSION_UNAVAILABLE);
    }
    const source = mapping.source === 'MEASUREMENT'
      ? observation.measurementValues
      : observation.answers;
    return {
      key: mapping.factKey,
      label: mapping.factLabel,
      value: normalizeAnswer(question, source[mapping.sourceKey])
    };
  });
}

/** 追加事实值并推进 owner/public 双指针，所有写入复用调用方事务。 */
export async function projectObservation(
  observation: RentalTaskObservation,
  template: DailyTaskTemplate,
  connection: PoolConnection
): Promise<ProjectObservationResult> {
  const facts = mapObservationToFacts(observation, template);
  const publicProjectionStatus = resolvePublicProjectionStatus(observation, template);
  const shouldProjectPublic = publicProjectionStatus === 'PUBLISHED';
  const ownerFactKeys: string[] = [];
  const publicFactKeys: string[] = [];

  for (const fact of facts) {
    const factValueId = await insertSpaceFactValue(connection, {
      rentalId: observation.rentalId,
      module: observation.module,
      key: fact.key,
      label: fact.label,
      value: fact.value,
      sourceObservationId: observation.id,
      visibility: observation.conclusionVisibility,
      integrityStatus: observation.integrityStatus,
      observedAt: observation.observedAt
    });
    await upsertSpaceFactHead(connection, {
      rentalId: observation.rentalId,
      module: observation.module,
      key: fact.key,
      ownerFactValueId: factValueId,
      publicFactValueId: shouldProjectPublic ? factValueId : undefined
    });
    ownerFactKeys.push(fact.key);
    if (shouldProjectPublic) publicFactKeys.push(fact.key);
  }

  return { ownerFactKeys, publicFactKeys, publicProjectionStatus };
}

/** 将结构化事实值转换为房主界面使用的简洁文本。 */
function formatFactValue(value: DailyTaskAnswerValue): string {
  return Array.isArray(value) ? value.join('、') : String(value);
}

/** 按观察距今时间计算单个字段的线性新鲜度。 */
function calculateFactFreshness(observedAt: string, now: Date): number {
  const elapsedDays = Math.max(
    0,
    Math.floor((now.getTime() - new Date(observedAt).getTime()) / 86_400_000)
  );
  const boundedDays = Math.min(FACT_FRESHNESS_WINDOW_DAYS, elapsedDays);
  return Math.round(100 - (boundedDays / FACT_FRESHNESS_WINDOW_DAYS) * 100);
}

/** 校验房主权限并返回六空间当前 owner facts 与平均新鲜度。 */
export async function readOwnerSpaceFacts(
  ownerOpenid: string,
  rentalId: string,
  now = new Date()
): Promise<OwnerSpaceFactSummary[]> {
  const ownership = await getOwnedRentalState(ownerOpenid, rentalId);
  if (ownership === 'NOT_OWNED') throw new AppError(BizCode.RENTAL_PERMISSION_DENIED);
  if (ownership === 'NOT_PUBLISHED') throw new AppError(BizCode.RENTAL_NOT_PUBLISHED);

  const currentFacts = await listOwnerSpaceFactHeads(rentalId);
  return HOUSE_MODULE_IDS.map((module) => {
    const facts = currentFacts.filter((fact) => fact.module === module);
    const freshnessPercent = facts.length === 0
      ? 0
      : Math.round(
          facts.reduce(
            (total, fact) => total + calculateFactFreshness(fact.observedAt, now),
            0
          ) / facts.length
        );
    return {
      module,
      freshnessPercent,
      facts: facts.map((fact) => ({
        key: fact.key,
        label: fact.label,
        value: formatFactValue(fact.value),
        observedAt: fact.observedAt
      }))
    };
  });
}
