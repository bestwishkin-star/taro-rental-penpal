import { describe, expect, it } from 'vitest';

import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import { selectDailyTaskTemplate } from './daily-task.selector';
import type { DailyTaskTemplate } from './daily-task.types';

/** 为选择器边界用例创建最小且可读的模板。 */
function createTemplate(
  overrides: Partial<DailyTaskTemplate> & Pick<DailyTaskTemplate, 'id' | 'module' | 'dimension'>
): DailyTaskTemplate {
  return {
    version: 1,
    generatorType: 'RULE',
    generatorVersion: 'rule-v1',
    policyVersion: 'daily-task-v1',
    type: 'TIMED_OBSERVATION',
    title: overrides.id,
    prompt: overrides.id,
    explanation: overrides.id,
    estimatedSeconds: 60,
    minimumDurationSeconds: 30,
    allowedPeriods: ['EVENING'],
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [],
    factMapping: [
      {
        sourceKey: 'answer',
        factKey: `${overrides.module}.${overrides.dimension}`,
        factLabel: overrides.dimension
      }
    ],
    cooldownDays: 14,
    active: true,
    ...overrides
  };
}

describe('DAILY_TASK_TEMPLATES', () => {
  it('首期恰好提供六个空间各四个模板并覆盖四类任务', () => {
    const modules = ['kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood'] as const;
    const taskTypes = [
      'TIMED_OBSERVATION',
      'PHOTO_EVIDENCE',
      'QUICK_MEASUREMENT',
      'DAILY_EVENT'
    ] as const;

    expect(DAILY_TASK_TEMPLATES).toHaveLength(24);
    for (const module of modules) {
      const moduleTemplates = DAILY_TASK_TEMPLATES.filter((template) => template.module === module);
      expect(moduleTemplates).toHaveLength(4);
      expect(new Set(moduleTemplates.map((template) => template.type))).toEqual(new Set(taskTypes));
    }
  });

  it('所有模板均可按模板编号和版本唯一定位', () => {
    const identities = DAILY_TASK_TEMPLATES.map((template) => `${template.id}:${template.version}`);

    expect(new Set(identities).size).toBe(DAILY_TASK_TEMPLATES.length);
    expect(DAILY_TASK_TEMPLATES.every((template) => template.version > 0)).toBe(true);
  });
});

describe('selectDailyTaskTemplate', () => {
  it('固定 seed 在相同上下文中返回相同模板和候选快照', () => {
    const input = {
      templates: DAILY_TASK_TEMPLATES,
      taskDate: '2026-08-10',
      period: 'EVENING' as const,
      recentTemplateIds: [],
      recentModules: [],
      staleDaysByFact: {},
      seed: 'rental-1:2026-08-10:0'
    };

    const first = selectDailyTaskTemplate(input);
    const replayed = selectDailyTaskTemplate({ ...input, templates: [...input.templates].reverse() });

    expect(replayed.template.id).toBe(first.template.id);
    expect(replayed.candidates).toEqual(first.candidates);
  });

  it('排除十四天冷却期内使用过的模板和连续第三天的同一空间', () => {
    const templates = [
      createTemplate({ id: 'bedroom-noise', module: 'bedroom', dimension: 'night-noise' }),
      createTemplate({ id: 'bedroom-light', module: 'bedroom', dimension: 'morning-light' }),
      createTemplate({ id: 'kitchen-ventilation', module: 'kitchen', dimension: 'ventilation' })
    ];

    const result = selectDailyTaskTemplate({
      templates,
      taskDate: '2026-08-10',
      period: 'EVENING',
      recentTemplateIds: ['bedroom-noise'],
      recentModules: ['bedroom', 'bedroom'],
      staleDaysByFact: { 'kitchen.ventilation': 18 },
      seed: 'rental-1:2026-08-10:0'
    });

    expect(result.template.id).toBe('kitchen-ventilation');
    expect(result.candidates.map((candidate) => candidate.templateId)).toEqual(['kitchen-ventilation']);
  });

  it('只保留当前时段允许执行的模板', () => {
    const result = selectDailyTaskTemplate({
      templates: [
        createTemplate({ id: 'daylight', module: 'living', dimension: 'daylight', allowedPeriods: ['DAYTIME'] }),
        createTemplate({ id: 'night-noise', module: 'bedroom', dimension: 'night-noise', allowedPeriods: ['LATE_NIGHT'] })
      ],
      taskDate: '2026-08-10',
      period: 'LATE_NIGHT',
      recentTemplateIds: [],
      recentModules: [],
      staleDaysByFact: {},
      seed: 'period-boundary'
    });

    expect(result.template.id).toBe('night-noise');
    expect(result.candidates).toHaveLength(1);
  });

  it('当前时段候选为空时只降级到覆盖全天的事件模板', () => {
    const result = selectDailyTaskTemplate({
      templates: [
        createTemplate({
          id: 'day-photo',
          module: 'living',
          dimension: 'daylight',
          type: 'PHOTO_EVIDENCE',
          allowedPeriods: ['DAYTIME']
        }),
        createTemplate({
          id: 'all-day-event',
          module: 'kitchen',
          dimension: 'daily-event',
          type: 'DAILY_EVENT',
          allowedPeriods: ['MORNING', 'DAYTIME', 'EVENING', 'LATE_NIGHT']
        })
      ],
      taskDate: '2026-08-10',
      period: 'LATE_NIGHT',
      recentTemplateIds: [],
      recentModules: [],
      staleDaysByFact: {},
      seed: 'all-day-fallback'
    });

    expect(result.template.id).toBe('all-day-event');
    expect(result.candidates[0]?.reasons).toContain('ALL_DAY_FALLBACK');
  });

  it('更换任务时排除原任务维度', () => {
    const result = selectDailyTaskTemplate({
      templates: [
        createTemplate({ id: 'noise-a', module: 'living', dimension: 'noise' }),
        createTemplate({ id: 'ventilation-b', module: 'kitchen', dimension: 'ventilation' })
      ],
      taskDate: '2026-08-10',
      period: 'EVENING',
      recentTemplateIds: [],
      recentModules: [],
      staleDaysByFact: {},
      excludedDimension: 'noise',
      seed: 'replacement'
    });

    expect(result.template.dimension).toBe('ventilation');
    expect(result.candidates.every((candidate) => candidate.dimension !== 'noise')).toBe(true);
  });

  it('未覆盖事实和更久未更新的事实获得更高权重', () => {
    const result = selectDailyTaskTemplate({
      templates: [
        createTemplate({ id: 'fresh', module: 'living', dimension: 'noise' }),
        createTemplate({ id: 'stale', module: 'kitchen', dimension: 'ventilation' }),
        createTemplate({ id: 'uncovered', module: 'bathroom', dimension: 'drainage' })
      ],
      taskDate: '2026-08-10',
      period: 'EVENING',
      recentTemplateIds: [],
      recentModules: [],
      staleDaysByFact: {
        'living.noise': 1,
        'kitchen.ventilation': 30
      },
      seed: 'weight-snapshot'
    });

    const weights = Object.fromEntries(result.candidates.map((candidate) => [candidate.templateId, candidate.weight]));
    expect(weights.stale).toBeGreaterThan(weights.fresh);
    expect(weights.uncovered).toBeGreaterThan(weights.fresh);
    expect(result.candidates.find((candidate) => candidate.templateId === 'stale')).toMatchObject({
      templateVersion: 1,
      module: 'kitchen',
      type: 'TIMED_OBSERVATION',
      dimension: 'ventilation'
    });
  });

  it('同空间刚出现一次时降低权重但仍保留候选资格', () => {
    const result = selectDailyTaskTemplate({
      templates: [
        createTemplate({ id: 'living-repeat', module: 'living', dimension: 'noise' }),
        createTemplate({ id: 'kitchen-other', module: 'kitchen', dimension: 'ventilation' })
      ],
      taskDate: '2026-08-10',
      period: 'EVENING',
      recentTemplateIds: [],
      recentModules: ['living'],
      staleDaysByFact: { 'living.noise': 5, 'kitchen.ventilation': 5 },
      seed: 'module-penalty'
    });

    const living = result.candidates.find((candidate) => candidate.templateId === 'living-repeat');
    const kitchen = result.candidates.find((candidate) => candidate.templateId === 'kitchen-other');
    expect(living).toBeDefined();
    expect(living!.weight).toBeLessThan(kitchen!.weight);
    expect(living!.reasons).toContain('RECENT_MODULE_PENALTY:-4');
  });

  it('没有符合规则的模板时给出明确错误', () => {
    expect(() =>
      selectDailyTaskTemplate({
        templates: [createTemplate({ id: 'day-only', module: 'living', dimension: 'daylight', allowedPeriods: ['DAYTIME'] })],
        taskDate: '2026-08-10',
        period: 'LATE_NIGHT',
        recentTemplateIds: [],
        recentModules: [],
        staleDaysByFact: {},
        seed: 'empty'
      })
    ).toThrow('没有符合当前规则的每日观察任务模板');
  });
});
