import type {
  DailyTaskCandidateSnapshot,
  DailyTaskSelection,
  DailyTaskTemplate,
  SelectDailyTaskInput
} from './daily-task.types';

/** 事实长时间未更新时最多计入的天数，避免单一旧事实垄断抽取。 */
const MAX_STALE_DAYS = 30;
/** 从未覆盖的事实获得的固定奖励。 */
const UNCOVERED_FACT_BONUS = 12;
/** 当前时段专属模板获得的奖励。 */
const EXACT_PERIOD_BONUS = 4;
/** 支持多个时段的模板获得的基础时段奖励。 */
const GENERAL_PERIOD_BONUS = 2;
/** 最近一次任务使用相同空间时施加的权重惩罚。 */
const RECENT_MODULE_PENALTY = 4;
/** 四个粗粒度时段，用于识别可安全降级的全天任务。 */
const ALL_PERIODS = ['MORNING', 'DAYTIME', 'EVENING', 'LATE_NIGHT'] as const;

/** 将稳定字符串转换为无符号 32 位 seed。 */
function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 根据 seed 生成位于 [0, 1) 的确定性小数。 */
function seededFraction(seed: string): number {
  let value = hashSeed(seed) + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

/** 判断候选是否会形成连续第三天相同空间。 */
function reachesThirdConsecutiveModule(
  template: DailyTaskTemplate,
  recentModules: SelectDailyTaskInput['recentModules']
): boolean {
  return (
    recentModules.length >= 2 &&
    recentModules[recentModules.length - 1] === template.module &&
    recentModules[recentModules.length - 2] === template.module
  );
}

/** 读取模板映射事实的最大陈旧天数，并识别是否存在未覆盖事实。 */
function readFreshness(
  template: DailyTaskTemplate,
  staleDaysByFact: SelectDailyTaskInput['staleDaysByFact']
): { staleDays: number; uncovered: boolean } {
  let staleDays = 0;
  let uncovered = false;

  for (const mapping of template.factMapping) {
    const value = staleDaysByFact[mapping.factKey];
    if (value === undefined) {
      uncovered = true;
      continue;
    }
    staleDays = Math.max(staleDays, Math.min(Math.max(value, 0), MAX_STALE_DAYS));
  }

  return { staleDays, uncovered };
}

/** 计算单个候选的最终权重和可审计原因。 */
function calculateCandidate(
  template: DailyTaskTemplate,
  input: SelectDailyTaskInput
): DailyTaskCandidateSnapshot {
  const freshness = readFreshness(template, input.staleDaysByFact);
  const uncoveredBonus = freshness.uncovered ? UNCOVERED_FACT_BONUS : 0;
  const periodBonus = template.allowedPeriods.length === 1 ? EXACT_PERIOD_BONUS : GENERAL_PERIOD_BONUS;
  const repeatsLatestModule = input.recentModules.at(-1) === template.module;
  const repetitionPenalty = repeatsLatestModule ? RECENT_MODULE_PENALTY : 0;
  const weight = Math.max(1, 1 + freshness.staleDays + uncoveredBonus + periodBonus - repetitionPenalty);
  const reasons = [
    'BASE:1',
    `STALE_DAYS:+${freshness.staleDays}`,
    `UNCOVERED_FACT:+${uncoveredBonus}`,
    `PERIOD_BONUS:+${periodBonus}`
  ];

  if (repetitionPenalty > 0) {
    reasons.push(`RECENT_MODULE_PENALTY:-${repetitionPenalty}`);
  }

  return {
    templateId: template.id,
    templateVersion: template.version,
    module: template.module,
    type: template.type,
    dimension: template.dimension,
    weight,
    reasons
  };
}

/** 从已排序候选中按累计权重执行确定性抽取。 */
function drawCandidate(candidates: readonly DailyTaskCandidateSnapshot[], seed: string): DailyTaskCandidateSnapshot {
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  const target = seededFraction(seed) * totalWeight;
  let cumulativeWeight = 0;

  for (const candidate of candidates) {
    cumulativeWeight += candidate.weight;
    if (target < cumulativeWeight) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1];
}

/**
 * 按冷却、时段、空间连续性和新鲜度规则选择每日任务。
 * 输入相同且模板内容不变时，返回结果与候选快照始终一致。
 */
export function selectDailyTaskTemplate(input: SelectDailyTaskInput): DailyTaskSelection {
  const coolingTemplateIds = new Set(input.recentTemplateIds);

  // 正常候选与全天降级共用冷却、维度和连续空间约束。
  const baseTemplates = input.templates
    .filter((template) => template.active)
    .filter((template) => !coolingTemplateIds.has(template.id))
    .filter((template) => template.dimension !== input.excludedDimension)
    .filter((template) => !reachesThirdConsecutiveModule(template, input.recentModules));
  const periodTemplates = baseTemplates.filter((template) =>
    template.allowedPeriods.includes(input.period)
  );
  const usedAllDayFallback = periodTemplates.length === 0;
  const eligibleTemplates = (usedAllDayFallback
    ? baseTemplates.filter((template) =>
        ALL_PERIODS.every((period) => template.allowedPeriods.includes(period))
      )
    : periodTemplates
  )
    .slice()
    .sort((left, right) => `${left.id}:${left.version}`.localeCompare(`${right.id}:${right.version}`));

  if (eligibleTemplates.length === 0) {
    throw new Error('没有符合当前规则的每日观察任务模板');
  }

  const candidates = eligibleTemplates.map((template) => calculateCandidate(template, input));
  if (usedAllDayFallback) {
    for (const candidate of candidates) candidate.reasons.push('ALL_DAY_FALLBACK');
  }
  const selectedCandidate = drawCandidate(candidates, input.seed);
  const template = eligibleTemplates.find(
    (item) => item.id === selectedCandidate.templateId && item.version === selectedCandidate.templateVersion
  );

  if (!template) {
    throw new Error('每日观察任务候选快照与模板版本不一致');
  }

  return {
    template,
    assignmentReason: usedAllDayFallback
      ? `按${input.taskDate}的${input.period}时段无可用候选，已从${candidates.length}个全天任务中依据空间覆盖与数据新鲜度加权选出`
      : `按${input.taskDate}的${input.period}时段，从${candidates.length}个候选中依据空间覆盖与数据新鲜度加权选出`,
    candidates
  };
}
