import type { DailyTaskQuestion } from '@shared/contracts/daily-task';

import type { DailyTaskFactMapping, DailyTaskPeriod, DailyTaskTemplate } from './daily-task.types';

/** 首期规则模板生成器版本。 */
const GENERATOR_VERSION = 'rule-v1';
/** 首期任务抽取与事实映射策略版本。 */
const POLICY_VERSION = 'daily-task-v1';
/** 所有首期模板统一使用的版本号。 */
const TEMPLATE_VERSION = 1;
/** 默认模板冷却天数。 */
const DEFAULT_COOLDOWN_DAYS = 14;

/** 模板声明中由工厂统一补齐的公共字段。 */
type DailyTaskTemplateDefinition = Omit<
  DailyTaskTemplate,
  | 'version'
  | 'generatorType'
  | 'generatorVersion'
  | 'policyVersion'
  | 'cooldownDays'
  | 'active'
>;

/** 创建单选问题，确保稳定选项值与展示文案分离。 */
function singleChoice(
  id: string,
  label: string,
  options: ReadonlyArray<readonly [value: string, label: string]>
): DailyTaskQuestion {
  return {
    id,
    label,
    kind: 'SINGLE_CHOICE',
    options: options.map(([value, optionLabel]) => ({ value, label: optionLabel }))
  };
}

/** 创建数值问题并声明服务端可校验的范围与单位。 */
function numberQuestion(
  id: string,
  label: string,
  min: number,
  max: number,
  unit: string
): DailyTaskQuestion {
  return { id, label, kind: 'NUMBER', min, max, unit };
}

/** 创建短文本问题，用于记录当天发生的具体事件。 */
function shortText(id: string, label: string): DailyTaskQuestion {
  return { id, label, kind: 'SHORT_TEXT' };
}

/** 创建答案或测量值到空间事实字段的映射。 */
function fact(
  sourceKey: string,
  factKey: string,
  factLabel: string,
  source: DailyTaskFactMapping['source'] = 'ANSWER'
): DailyTaskFactMapping {
  return { sourceKey, factKey, factLabel, source };
}

/** 创建不可变的首期规则模板。 */
function defineTemplate(definition: DailyTaskTemplateDefinition): DailyTaskTemplate {
  return {
    ...definition,
    version: TEMPLATE_VERSION,
    generatorType: 'RULE',
    generatorVersion: GENERATOR_VERSION,
    policyVersion: POLICY_VERSION,
    cooldownDays: DEFAULT_COOLDOWN_DAYS,
    active: true
  };
}

/** 常用白天时段，适合自然采光和公共区域观察。 */
const DAY_PERIODS: readonly DailyTaskPeriod[] = ['MORNING', 'DAYTIME'];
/** 常用居家时段，适合噪声、气味和使用体验观察。 */
const HOME_PERIODS: readonly DailyTaskPeriod[] = ['EVENING', 'LATE_NIGHT'];
/** 非深夜通用时段，适合拍照与简单测量。 */
const GENERAL_PERIODS: readonly DailyTaskPeriod[] = ['MORNING', 'DAYTIME', 'EVENING'];
/** 全天任务仅承载无需外出、无需拍照的当日事件，供时段候选为空时安全降级。 */
const ALL_DAY_PERIODS: readonly DailyTaskPeriod[] = [
  'MORNING',
  'DAYTIME',
  'EVENING',
  'LATE_NIGHT'
];

/** 首期 24 个版本化模板：六个空间各四个，完整覆盖四类任务。 */
export const DAILY_TASK_TEMPLATES: readonly DailyTaskTemplate[] = [
  defineTemplate({
    id: 'kitchen-ventilation',
    module: 'kitchen',
    type: 'TIMED_OBSERVATION',
    dimension: 'ventilation',
    title: '留意一餐后的空气',
    prompt: '做饭后停留两分钟，观察油烟和气味多久开始散去。',
    explanation: '持续观察比瞬间印象更能反映厨房通风表现。',
    estimatedSeconds: 150,
    minimumDurationSeconds: 120,
    allowedPeriods: HOME_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('odor_after_two_minutes', '两分钟后气味如何？', [['clear', '基本散去'], ['noticeable', '仍能闻到'], ['strong', '依然明显']])],
    factMapping: [fact('odor_after_two_minutes', 'kitchen.ventilation', '餐后通风表现')]
  }),
  defineTemplate({
    id: 'kitchen-worktop-photo',
    module: 'kitchen',
    type: 'PHOTO_EVIDENCE',
    dimension: 'worktop-layout',
    title: '记录此刻的操作台',
    prompt: '按随机拍摄引导记录水槽、灶台和主要操作区的同框状态。',
    explanation: '现场视角可以反映真实可用台面和动线。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: true, requiresCaptureChallenge: true },
    questionSchema: [singleChoice('worktop_state', '备餐时台面够用吗？', [['enough', '够用'], ['tight', '有些局促'], ['blocked', '经常被占满']])],
    factMapping: [fact('worktop_state', 'kitchen.worktop-layout', '厨房操作台可用情况')]
  }),
  defineTemplate({
    id: 'kitchen-passage-measurement',
    module: 'kitchen',
    type: 'QUICK_MEASUREMENT',
    dimension: 'passage-width',
    title: '量一量厨房通道',
    prompt: '测量橱柜与对面墙面或设施之间最窄的通行宽度。',
    explanation: '最窄处宽度能直观反映双人使用和转身空间。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [numberQuestion('passage_width_cm', '最窄处宽度', 30, 300, '厘米')],
    factMapping: [fact('passage_width_cm', 'kitchen.passage-width', '厨房最窄通道', 'MEASUREMENT')]
  }),
  defineTemplate({
    id: 'kitchen-cooking-event',
    module: 'kitchen',
    type: 'DAILY_EVENT',
    dimension: 'cooking-experience',
    title: '记下今天的一次下厨',
    prompt: '回想今天做饭时最影响体验的一件小事。',
    explanation: '具体事件能补足尺寸与照片无法表达的使用感受。',
    estimatedSeconds: 75,
    minimumDurationSeconds: 0,
    allowedPeriods: ALL_DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('cooking_result', '今天下厨整体如何？', [['smooth', '顺手'], ['minor_issue', '有点不便'], ['difficult', '明显难用']]), shortText('cooking_note', '发生了什么？')],
    factMapping: [fact('cooking_result', 'kitchen.cooking-experience', '近期下厨体验')]
  }),

  defineTemplate({
    id: 'bathroom-dampness',
    module: 'bathroom',
    type: 'TIMED_OBSERVATION',
    dimension: 'dampness',
    title: '观察洗浴后的潮气',
    prompt: '洗浴后等待两分钟，观察镜面、墙面和空气中的潮气变化。',
    explanation: '固定时长的观察有助于判断排风与干燥速度。',
    estimatedSeconds: 150,
    minimumDurationSeconds: 120,
    allowedPeriods: HOME_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('dampness_after_two_minutes', '两分钟后潮气如何？', [['mostly_clear', '大多散去'], ['remaining', '仍有潮气'], ['heavy', '潮气很重']])],
    factMapping: [fact('dampness_after_two_minutes', 'bathroom.dampness', '洗浴后潮气消散情况')]
  }),
  defineTemplate({
    id: 'bathroom-drain-photo',
    module: 'bathroom',
    type: 'PHOTO_EVIDENCE',
    dimension: 'drainage-layout',
    title: '记录排水区域',
    prompt: '避开私人物品，按引导记录淋浴区与地漏的相对位置。',
    explanation: '排水布局与地面状态可以辅助理解积水风险。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: true, requiresCaptureChallenge: true },
    questionSchema: [singleChoice('drainage_state', '日常排水表现如何？', [['fast', '排得快'], ['slow', '偶尔积水'], ['ponding', '经常积水']])],
    factMapping: [fact('drainage_state', 'bathroom.drainage-layout', '卫生间排水表现')]
  }),
  defineTemplate({
    id: 'bathroom-hot-water-wait',
    module: 'bathroom',
    type: 'QUICK_MEASUREMENT',
    dimension: 'hot-water-wait',
    title: '测一次热水等待',
    prompt: '从打开热水开始计时，到水温适合洗浴时停止。',
    explanation: '实际等待秒数比笼统描述更能还原日常体验。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: HOME_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [numberQuestion('hot_water_wait_seconds', '等待热水用时', 0, 600, '秒')],
    factMapping: [fact('hot_water_wait_seconds', 'bathroom.hot-water-wait', '热水等待时间', 'MEASUREMENT')]
  }),
  defineTemplate({
    id: 'bathroom-use-event',
    module: 'bathroom',
    type: 'DAILY_EVENT',
    dimension: 'daily-use',
    title: '记下今天的洗浴体验',
    prompt: '记录今天使用卫生间时最明显的一次顺畅或不便。',
    explanation: '事件记录能呈现异味、水压和拥挤等偶发问题。',
    estimatedSeconds: 75,
    minimumDurationSeconds: 0,
    allowedPeriods: ALL_DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('bathroom_experience', '今天使用感受如何？', [['comfortable', '舒适'], ['ordinary', '一般'], ['troubled', '有困扰']]), shortText('bathroom_note', '具体发生了什么？')],
    factMapping: [fact('bathroom_experience', 'bathroom.daily-use', '近期洗浴体验')]
  }),

  defineTemplate({
    id: 'living-evening-noise',
    module: 'living',
    type: 'TIMED_OBSERVATION',
    dimension: 'evening-noise',
    title: '听一会儿客厅的声音',
    prompt: '关闭影音设备静坐一分钟，留意邻居、街道和设备声。',
    explanation: '安静观察可以区分持续噪声与偶发声响。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 60,
    allowedPeriods: HOME_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('noise_level', '这一分钟的声音感受？', [['quiet', '安静'], ['noticeable', '听得到但不打扰'], ['disturbing', '明显打扰']])],
    factMapping: [fact('noise_level', 'living.evening-noise', '客厅夜间噪声')]
  }),
  defineTemplate({
    id: 'living-daylight-photo',
    module: 'living',
    type: 'PHOTO_EVIDENCE',
    dimension: 'daylight',
    title: '留下客厅自然光',
    prompt: '不打开主灯，按引导从常坐位置拍摄客厅自然采光。',
    explanation: '现场照片与天气感受结合，更接近真实采光体验。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: true, requiresCaptureChallenge: true },
    questionSchema: [singleChoice('daylight_level', '不开灯时体感如何？', [['bright', '明亮'], ['adequate', '够用'], ['dim', '偏暗']])],
    factMapping: [fact('daylight_level', 'living.daylight', '客厅自然采光')]
  }),
  defineTemplate({
    id: 'living-passage-measurement',
    module: 'living',
    type: 'QUICK_MEASUREMENT',
    dimension: 'main-passage-width',
    title: '量一量客厅主通道',
    prompt: '测量沙发、茶几等家具之间日常走动最窄的位置。',
    explanation: '家具摆放后的净宽比空房尺寸更贴近日常通行。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [numberQuestion('main_passage_width_cm', '主通道最窄净宽', 20, 500, '厘米')],
    factMapping: [fact('main_passage_width_cm', 'living.main-passage-width', '客厅主通道净宽', 'MEASUREMENT')]
  }),
  defineTemplate({
    id: 'living-shared-event',
    module: 'living',
    type: 'DAILY_EVENT',
    dimension: 'shared-use',
    title: '记下今天的客厅时刻',
    prompt: '记录今天在客厅停留时最影响舒适度的一件事。',
    explanation: '真实事件能够呈现多人共处、温度和动线变化。',
    estimatedSeconds: 75,
    minimumDurationSeconds: 0,
    allowedPeriods: ALL_DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('shared_use_feeling', '今天客厅使用感受？', [['relaxed', '放松'], ['neutral', '普通'], ['crowded', '局促或受扰']]), shortText('shared_use_note', '哪件事最明显？')],
    factMapping: [fact('shared_use_feeling', 'living.shared-use', '近期客厅使用体验')]
  }),

  defineTemplate({
    id: 'bedroom-night-noise',
    module: 'bedroom',
    type: 'TIMED_OBSERVATION',
    dimension: 'night-noise',
    title: '听一会儿入睡环境',
    prompt: '准备休息时静听一分钟，留意墙外、窗外和设备声。',
    explanation: '接近入睡时段的观察最能反映卧室声音环境。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 60,
    allowedPeriods: ['LATE_NIGHT'],
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('sleep_noise', '声音会影响入睡吗？', [['none', '不会'], ['slight', '偶尔注意到'], ['disturbing', '会被打扰']])],
    factMapping: [fact('sleep_noise', 'bedroom.night-noise', '卧室入睡噪声')]
  }),
  defineTemplate({
    id: 'bedroom-window-photo',
    module: 'bedroom',
    type: 'PHOTO_EVIDENCE',
    dimension: 'window-daylight',
    title: '记录卧室窗边光线',
    prompt: '整理隐私物品后，从床边常用视角记录窗户与室内采光。',
    explanation: '固定生活视角能体现窗户尺度与遮挡影响。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: true, requiresCaptureChallenge: true },
    questionSchema: [singleChoice('window_light', '白天不开灯是否够用？', [['enough', '够用'], ['borderline', '勉强'], ['dim', '偏暗']])],
    factMapping: [fact('window_light', 'bedroom.window-daylight', '卧室窗边采光')]
  }),
  defineTemplate({
    id: 'bedroom-bedside-passage',
    module: 'bedroom',
    type: 'QUICK_MEASUREMENT',
    dimension: 'bedside-passage',
    title: '量一量床边过道',
    prompt: '测量床沿到墙面或衣柜之间最窄的日常通道。',
    explanation: '摆入家具后的净宽能反映起居和收纳是否方便。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [numberQuestion('bedside_passage_cm', '床边最窄通道', 10, 300, '厘米')],
    factMapping: [fact('bedside_passage_cm', 'bedroom.bedside-passage', '床边通道净宽', 'MEASUREMENT')]
  }),
  defineTemplate({
    id: 'bedroom-sleep-event',
    module: 'bedroom',
    type: 'DAILY_EVENT',
    dimension: 'sleep-experience',
    title: '记下昨夜的睡眠环境',
    prompt: '回想昨夜是否被光线、声音、温度或气味影响。',
    explanation: '按天记录具体干扰，比一次性评价更能呈现波动。',
    estimatedSeconds: 75,
    minimumDurationSeconds: 0,
    allowedPeriods: ALL_DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('sleep_quality', '环境对昨夜睡眠的影响？', [['none', '没有影响'], ['minor', '轻微影响'], ['major', '明显影响']]), shortText('sleep_note', '主要是什么影响？')],
    factMapping: [fact('sleep_quality', 'bedroom.sleep-experience', '近期睡眠环境体验')]
  }),

  defineTemplate({
    id: 'hallway-sound-observation',
    module: 'hallway',
    type: 'TIMED_OBSERVATION',
    dimension: 'shared-noise',
    title: '听听门外的公共声音',
    prompt: '在屋内靠近入户门的位置静听一分钟，记录楼道声音。',
    explanation: '隔门观察可反映公共区域声音对室内的影响。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 60,
    allowedPeriods: HOME_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('hallway_noise', '这一分钟听到什么程度？', [['quiet', '基本安静'], ['passing', '偶有经过声'], ['frequent', '频繁或明显']])],
    factMapping: [fact('hallway_noise', 'hallway.shared-noise', '楼道声音影响')]
  }),
  defineTemplate({
    id: 'hallway-route-photo',
    module: 'hallway',
    type: 'PHOTO_EVIDENCE',
    dimension: 'access-route',
    title: '记录回家的最后一段路',
    prompt: '按引导拍摄入户门外至楼梯或电梯方向的公共通道。',
    explanation: '真实通道视角能反映照明、杂物和通行条件。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: true, requiresCaptureChallenge: true },
    questionSchema: [singleChoice('route_state', '当前通道是否好走？', [['clear', '通畅'], ['narrow', '略窄或有杂物'], ['blocked', '明显受阻']])],
    factMapping: [fact('route_state', 'hallway.access-route', '入户公共通道')]
  }),
  defineTemplate({
    id: 'hallway-exit-time',
    module: 'hallway',
    type: 'QUICK_MEASUREMENT',
    dimension: 'vertical-access-time',
    title: '测一次下楼用时',
    prompt: '从关上入户门开始，到抵达楼栋出口时停止计时。',
    explanation: '一次真实用时可以辅助理解楼层和电梯等待体验。',
    estimatedSeconds: 180,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [numberQuestion('exit_time_seconds', '到楼栋出口用时', 5, 1800, '秒')],
    factMapping: [fact('exit_time_seconds', 'hallway.vertical-access-time', '从家到楼栋出口用时', 'MEASUREMENT')]
  }),
  defineTemplate({
    id: 'hallway-access-event',
    module: 'hallway',
    type: 'DAILY_EVENT',
    dimension: 'access-experience',
    title: '记下今天一次进出体验',
    prompt: '记录今天进出楼栋时遇到的便利或麻烦。',
    explanation: '电梯、门禁、照明等问题往往需要按事件持续记录。',
    estimatedSeconds: 75,
    minimumDurationSeconds: 0,
    allowedPeriods: ALL_DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('access_feeling', '今天进出是否顺利？', [['smooth', '顺利'], ['delay', '稍有等待'], ['problem', '遇到问题']]), shortText('access_note', '具体发生了什么？')],
    factMapping: [fact('access_feeling', 'hallway.access-experience', '近期楼栋进出体验')]
  }),

  defineTemplate({
    id: 'neighborhood-street-noise',
    module: 'neighborhood',
    type: 'TIMED_OBSERVATION',
    dimension: 'street-noise',
    title: '听一会儿楼下的声音',
    prompt: '在楼栋附近安全位置停留一分钟，留意交通、商铺和人声。',
    explanation: '同一位置按天观察，能看出周边声音的时段变化。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 60,
    allowedPeriods: ['DAYTIME', 'EVENING'],
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('street_noise_level', '当前声音环境如何？', [['quiet', '安静'], ['active', '有生活声但可接受'], ['noisy', '较吵']])],
    factMapping: [fact('street_noise_level', 'neighborhood.street-noise', '周边街道声音')]
  }),
  defineTemplate({
    id: 'neighborhood-entrance-photo',
    module: 'neighborhood',
    type: 'PHOTO_EVIDENCE',
    dimension: 'entrance-environment',
    title: '记录今天的楼栋入口',
    prompt: '按随机拍摄引导记录楼栋入口与紧邻的步行环境。',
    explanation: '现场入口状态可以反映照明、整洁和实际通行条件。',
    estimatedSeconds: 90,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: true, requiresCaptureChallenge: true },
    questionSchema: [singleChoice('entrance_state', '今天入口环境如何？', [['pleasant', '整洁好走'], ['ordinary', '普通'], ['poor', '昏暗或受阻']])],
    factMapping: [fact('entrance_state', 'neighborhood.entrance-environment', '楼栋入口环境')]
  }),
  defineTemplate({
    id: 'neighborhood-transit-walk',
    module: 'neighborhood',
    type: 'QUICK_MEASUREMENT',
    dimension: 'transit-walk-time',
    title: '测一次真实步行时间',
    prompt: '从楼栋入口开始，到最常用公交站或地铁入口时停止计时。',
    explanation: '真实步行分钟数比地图直线距离更贴近日常通勤。',
    estimatedSeconds: 180,
    minimumDurationSeconds: 0,
    allowedPeriods: GENERAL_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [numberQuestion('transit_walk_minutes', '实际步行用时', 1, 120, '分钟')],
    factMapping: [fact('transit_walk_minutes', 'neighborhood.transit-walk-time', '步行到常用公共交通用时', 'MEASUREMENT')]
  }),
  defineTemplate({
    id: 'neighborhood-daily-event',
    module: 'neighborhood',
    type: 'DAILY_EVENT',
    dimension: 'daily-environment',
    title: '记下今天的周边片段',
    prompt: '记录今天出门或回家时，周边最让你在意的一件事。',
    explanation: '持续的小事件能呈现施工、商业和安全感等真实变化。',
    estimatedSeconds: 75,
    minimumDurationSeconds: 0,
    allowedPeriods: ALL_DAY_PERIODS,
    evidenceRequirement: { requiresPhoto: false, requiresCaptureChallenge: false },
    questionSchema: [singleChoice('environment_feeling', '这件事带来的感受？', [['positive', '便利或舒适'], ['neutral', '没有明显影响'], ['negative', '造成困扰']]), shortText('environment_note', '发生了什么？')],
    factMapping: [fact('environment_feeling', 'neighborhood.daily-environment', '近期周边居住体验')]
  })
];
