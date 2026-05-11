# 发现页阅读流重设计实施计划

> 给后续执行者：请先通读本计划。实施时按步骤推进，保持改动集中；本轮不运行测试、不提交代码，等待用户自行测试后统一处理。

**目标：** 将发现页从信息密集、字体杂乱的租房列表，重构为更适合阅读的单列内容流。页面应突出“翻看他人的居住经历”，弱化工具感，让筛选能力收进按钮里，默认状态更安静、更耐看。

**架构：** 复用现有 Taro + React 页面和接口数据，不新增路由、不改接口契约。主要调整页面结构、组件文案、筛选呈现方式和卡片视觉层级。

**技术栈：** Taro、React、TypeScript、SCSS。

## 用户约束

- 不由助手运行测试或 typecheck，用户后续自行测试。
- 暂不提交代码，用户测试后统一提交。
- 文案要更文艺，但不能牺牲可读性。
- 发现页选择 B3 方向：单列阅读型信息流。
- 顶部筛选选择方案 2：筛选收进按钮，点击后展开筛选面板。

## 设计方向

- 页面主标题使用「一方屋檐下」，延续经历分享社区的表达。
- 副标题用更轻的语气说明页面用途，例如「翻看城市里的居住冷暖」。
- 搜索框保留在顶部，但视觉上更像阅读入口，而不是强运营工具。
- 筛选、区域、排序默认收起到按钮中，只有用户需要时才展开。
- 房源卡片改为阅读卡：图片、标题、摘要、标签和互动数据依次铺开，减少拥挤感。
- 字号层级统一：页面标题最大，卡片标题次之，摘要和元信息保持安静。

## 涉及文件

- `apps/frontend/src/pages/find/index.tsx`
- `apps/frontend/src/pages/find/index.scss`
- `apps/frontend/src/pages/find/components/SearchBar/index.tsx`
- `apps/frontend/src/pages/find/components/SearchBar/index.scss`
- `apps/frontend/src/pages/find/components/FilterChips/index.tsx`
- `apps/frontend/src/pages/find/components/FilterChips/index.scss`
- `apps/frontend/src/pages/find/components/RegionFilter/index.scss`
- `apps/frontend/src/pages/find/components/SortBar/index.tsx`
- `apps/frontend/src/pages/find/components/SortBar/index.scss`
- `apps/frontend/src/pages/find/components/RentalCard/index.tsx`
- `apps/frontend/src/pages/find/components/RentalCard/index.scss`

## 实施步骤

### 1. 重组发现页顶部结构

- 在发现页增加 `showFilters` 状态，用来控制筛选面板展开和收起。
- 增加 `hasActiveFilters` 判断，用来给筛选按钮显示激活态。
- 顶部结构调整为标题、副标题、筛选按钮、搜索框和可折叠筛选面板。
- 重置筛选时同步清空关键词、分类、价格、区域、排序，并收起筛选面板。

### 2. 优化搜索组件

- 移除搜索框内部的筛选按钮，让筛选只由页面顶部按钮承载。
- 搜索占位文案调整为「搜索城市、地标、通勤、隔音...」。
- 调整搜索框高度、字号和留白，使其和阅读流顶部一致。

### 3. 调整筛选面板

- 将居住方式和费用范围分组展示。
- 区域筛选、排序筛选放入同一个展开面板。
- 筛选项采用轻量胶囊样式，激活态用克制的绿色强调。
- 面板底部保留「清空筛选」操作。

### 4. 重做阅读卡片

- 卡片信息顺序调整为：图片或占位、标题、位置/价格/阶段、摘要、标签、互动信息。
- 对缺失字段提供自然兜底，例如「区域待补充」「费用待补充」。
- 居住阶段转换为用户能理解的中文标签。
- 避免摘要和标题重复时重复展示。
- 凭证状态使用安静的辅助徽标，不抢标题层级。

### 5. 统一页面视觉

- 页面背景使用浅暖灰，避免纯白列表的生硬感。
- 卡片圆角、阴影、边框保持克制，避免过度装饰。
- 字体层级统一：标题 24px，副标题 13px，卡片标题 18px，正文 14px，辅助信息 12-13px。
- 保持单列布局，列表间距更宽松，让页面更像阅读流。

## 验收重点

- 默认进入发现页时，页面应是单列阅读流，而不是密集筛选页。
- 筛选按钮可展开和收起面板，已有筛选时有明确激活态。
- 搜索、分类、区域、价格、排序仍能正常驱动原有列表查询。
- 空状态、加载中、加载更多、到底文案和新语气一致。
- 卡片标题、摘要、标签、价格、区域在窄屏下不能挤压或重叠。

## 暂不执行

- 不运行自动化测试或 typecheck。
- 不新增后端接口。
- 不改页面路由。
- 不提交代码。
