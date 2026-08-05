import type { HouseModuleId, SpacePrompt, SpacePromptConfig } from '@shared/contracts/rental-space';

/** 当前题目版本；历史答案通过该版本判断是否需要刷新。 */
const PROMPT_VERSION = '2026-08-04';

/** 构造稳定的题目选项，value 不随中文文案调整而变化。 */
function option(value: string, label: string) {
  return { value, label };
}

/** 创建单选场景题的简化工厂。 */
function single(id: string, title: string, labels: string[]): SpacePrompt {
  return {
    id,
    title,
    control: 'SINGLE_CHOICE',
    options: labels.map((label, index) => option(String(index + 1), label)),
    isRequired: false
  };
}

/** 六个空间模块的完整题目配置。 */
const PROMPT_CONFIGS: Record<HouseModuleId, SpacePromptConfig> = {
  kitchen: {
    module: 'kitchen',
    promptVersion: PROMPT_VERSION,
    capturePrompt: '请站在日常做饭的位置，拍下水槽、台面和灶台之间的真实距离。',
    prompts: [
      single('cooking_frequency', '你通常多久在这里做一次饭？', ['几乎不做', '每周一两次', '多数工作日', '几乎每天']),
      single('smoke', '做饭时油烟最接近哪种情况？', ['散得很快', '偶尔残留', '经常飘进房间', '不适合重油烟']),
      single('counter_storage', '台面和收纳够用吗？', ['宽松', '刚好够用', '需要频繁腾挪', '明显不足']),
      single('water_drainage', '用水和排水是否稳定？', ['一直稳定', '偶尔水压小', '排水偏慢', '经常影响使用']),
      single('pests', '过去一个月见过虫害吗？', ['没有', '偶尔一只', '反复出现', '需要持续处理'])
    ],
    eventPrompt: '回想最近一次做饭或清洁：发生了什么，对你有什么影响，你最后怎么处理？'
  },
  bathroom: {
    module: 'bathroom',
    promptVersion: PROMPT_VERSION,
    capturePrompt: '请拍下淋浴、地漏和通风位置，让人能看清它们的相对距离。',
    prompts: [
      single('hot_water', '热水体验如何？', ['稳定且来得快', '需要等一会儿', '温度偶尔波动', '经常影响洗澡']),
      single('drainage', '洗澡后的排水情况？', ['很快排净', '短暂积水', '经常积水', '有返水情况']),
      single('odor', '异味出现频率？', ['没有', '天气变化时偶尔有', '每周都会有', '长期存在']),
      single('ventilation_mold', '通风和霉斑情况？', ['干燥无霉斑', '潮湿但无明显霉斑', '局部反复发霉', '长期潮湿发霉']),
      single('privacy', '使用时的隐私感如何？', ['很好', '基本够用', '偶尔尴尬', '明显不足'])
    ],
    eventPrompt: '最近一次洗澡、清洁或使用卫生间时，哪件具体事情最影响体验？'
  },
  living: {
    module: 'living',
    promptVersion: PROMPT_VERSION,
    capturePrompt: '请从你最常坐的位置拍向窗户和主要活动区域。',
    prompts: [
      single('daylight', '白天不开灯时的采光？', ['很明亮', '基本够用', '部分时段偏暗', '大部分时间需要开灯']),
      single('noise', '休息时最常听到的噪声？', ['基本安静', '偶尔能听见', '每天明显听见', '经常被打扰']),
      single('temperature', '夏冬体感如何？', ['比较舒适', '偶尔偏冷或偏热', '季节性明显难受', '长期难调节']),
      single('movement', '多人活动时动线是否冲突？', ['很顺畅', '偶尔让路', '经常互相影响', '空间基本无法共用']),
      single('shared_use', '公共区域通常能自由使用吗？', ['随时可用', '需要协调', '经常被占用', '基本不用'])
    ],
    eventPrompt: '讲一次休息、会客或与室友共处时真实发生的事情，以及它如何影响你。'
  },
  bedroom: {
    module: 'bedroom',
    promptVersion: PROMPT_VERSION,
    capturePrompt: '请从床边拍向窗户和房门，呈现睡眠空间的真实尺度。',
    prompts: [
      single('sleep_noise', '睡觉时的噪声情况？', ['很安静', '偶尔听见', '经常影响入睡', '会被吵醒']),
      single('blackout', '早晨遮光效果？', ['遮光很好', '有少量漏光', '天亮后明显变亮', '很早就被照醒']),
      single('climate', '房间冷热和湿度？', ['舒适', '偶尔不适', '季节性明显不适', '长期潮湿或闷热']),
      single('storage', '个人物品收纳够用吗？', ['充足', '刚好', '需要堆放', '明显不足']),
      single('privacy', '关门后的隐私感？', ['很好', '基本够用', '声音容易传出去', '缺少独立感'])
    ],
    eventPrompt: '回想最近一次被吵醒、感到闷热或觉得很舒适的夜晚，具体发生了什么？'
  },
  hallway: {
    module: 'hallway',
    promptVersion: PROMPT_VERSION,
    capturePrompt: '请拍下从入户门看向楼梯或电梯的路线，不要拍到邻居门牌。',
    prompts: [
      single('access', '门禁日常使用情况？', ['稳定方便', '偶尔失灵', '经常需要等待', '基本没有门禁']),
      single('elevator', '上下楼体验？', ['方便稳定', '高峰需要等', '偶尔故障', '长期不便']),
      single('lighting', '夜间照明是否足够？', ['全程明亮', '局部偏暗', '经常不开灯', '会影响安全感']),
      single('hygiene_odor', '卫生和异味情况？', ['干净无异味', '偶尔脏乱', '经常有异味', '长期影响通行']),
      single('delivery', '快递外卖放置安全吗？', ['很安全', '偶尔拿错', '经常混乱', '发生过丢失'])
    ],
    eventPrompt: '最近一次深夜回家、等电梯或取快递时，发生了什么具体事情？'
  },
  neighborhood: {
    module: 'neighborhood',
    promptVersion: PROMPT_VERSION,
    capturePrompt: '请在住宅附近公共区域拍下你每天最常经过的一段路，避开清晰人脸和门牌。',
    prompts: [
      single('night_route', '夜间回家的路线感受？', ['明亮安心', '部分路段偏暗', '需要绕行', '会刻意避免独行']),
      single('transit', '日常交通便利程度？', ['步行很近', '需要短途接驳', '等待时间较长', '明显不方便']),
      single('groceries', '购买日常用品方便吗？', ['选择很多', '基本够用', '需要走较远', '很不方便']),
      single('noise', '周边持续噪声情况？', ['基本没有', '特定时段有', '每天明显', '经常影响休息']),
      single('weather', '下雨后的道路情况？', ['排水正常', '局部积水', '经常难走', '会影响出行'])
    ],
    eventPrompt: '最近一次夜间回家、买东西或遇到恶劣天气时，周边环境给你带来了什么影响？'
  }
};

/** 每次现场拍摄随机抽取的挑战文案，用于提高直接复用网图的成本。 */
const CAPTURE_PROMPT_VARIANTS: Record<HouseModuleId, string[]> = {
  kitchen: [
    '从你平时切菜的位置，同时拍到水槽和灶台。',
    '打开一个常用橱柜，拍下橱柜内部和旁边台面。',
    '站在厨房入口，拍下做饭时需要转身经过的区域。'
  ],
  bathroom: [
    '从卫生间门口同时拍到淋浴区和地漏。',
    '拍下洗手台下方管道与附近地面。',
    '从淋浴位置拍向通风口或窗户。'
  ],
  living: [
    '从你最常坐的位置拍向窗户。',
    '站在客厅入口拍下主要活动动线。',
    '从窗边拍向你最常休息的位置。'
  ],
  bedroom: [
    '坐在床边，同时拍到房门和窗户。',
    '从房门位置拍下床与主要收纳区域。',
    '站在窗边拍向床头和插座位置。'
  ],
  hallway: [
    '从入户门内侧拍向楼梯或电梯方向，避开门牌。',
    '拍下夜间最暗的一段公共通道，避开邻居门牌。',
    '从电梯或楼梯口拍向回家的路线。'
  ],
  neighborhood: [
    '拍下住宅附近每天最常经过的路口，避开清晰人脸。',
    '拍下从住宅走向最近生活设施的一段公共道路。',
    '拍下夜间回家路线中照明最弱的位置。'
  ]
};

/** 获取指定空间的版本化题目配置。 */
export function getSpacePromptConfig(module: HouseModuleId): SpacePromptConfig {
  return PROMPT_CONFIGS[module];
}

/** 随机生成一个短时有效的现场拍摄要求。 */
export function getRandomCapturePrompt(module: HouseModuleId): string {
  const prompts = CAPTURE_PROMPT_VARIANTS[module];
  return prompts[Math.floor(Math.random() * prompts.length)];
}
