# 空间记录与居住可信依据任务清单

## Task 1: 定义共享合同与题目配置

**Acceptance:** 六个模块、照片可见性、草稿摘要、点位输入输出、可信依据均有稳定 TypeScript 类型。

**Verify:** `pnpm typecheck`；检查前后端均从 `@shared/contracts` 导入。

**Dependencies:** None

**Files:** `packages/shared/src/contracts/rental.ts`、`packages/shared/src/index.ts`、合同测试。

## Task 2: 添加草稿与空间记录数据结构

**Acceptance:** 草稿、空间记录、空间照片、微打卡表可重复执行创建；关键唯一索引和隐私字段存在。

**Verify:** 审阅 SQL；在用户测试环境执行 schema 更新。

**Dependencies:** Task 1

**Files:** `apps/backend/schema.sql`、草稿 repository 及其测试。

## Task 3: 建立图片资产与异步分析边界

**Acceptance:** 上传响应兼容新增 `assetId`；保存 SHA-256/感知哈希；安全、家庭一致性和网图风险使用统一任务模型与 adapter；小程序不接触厂商密钥。

**Verify:** 上传边界、任务重试、供应商结果映射和私密原始结果过滤测试。

**Dependencies:** Tasks 1-2

**Files:** 上传 route/service、图片分析 service/repository、`PhotoAnalyzer` adapter 及测试。

## Task 4: 实现当前草稿摘要闭环

**Acceptance:** 创建接口幂等；摘要包含六点状态和服务端完整度；越权访问返回稳定错误。

**Verify:** 后端 service/route 测试；手工请求创建与读取接口。

**Dependencies:** Tasks 1-3

**Files:** 草稿 service、`/api/rental-drafts`、`/api/rental-drafts/current` 及测试。

## Task 5: 实现单点记录读写接口

**Acceptance:** 可读取题目与记录、PATCH 自动保存、绑定/修改/删除照片；完成条件由服务端计算。

**Verify:** 覆盖无效模块、过期挑战、私密照片和重复保存测试。

**Dependencies:** Task 4

**Files:** 点位 route、照片 route、草稿 service/repository。

## Task 6: 增加点位任务页骨架与 API 接入

**Acceptance:** 高亮点可跳转正确模块；任务页可加载、显示步骤、退出后恢复；路由参数无效时友好返回。

**Verify:** 前端组件测试；用户在开发者工具中检查六个入口。

**Dependencies:** Task 5

**Files:** `app.config.ts`、前端 API service、分享页、点位页入口与配置。

## Task 7: 实现现场照片、隐私选择与分析状态

**Acceptance:** 相机拍摄、上传进度、失败重试、删除和公开/仅核验选择可用；页面展示安全分析中、需复核或不可公开等粗粒度状态。

**Verify:** 组件测试；用户真机验证权限拒绝、弱网和重新进入。

**Dependencies:** Task 6

**Files:** `CaptureStep`、点位页、前端 API service。

## Task 8: 实现日常场景、具体事件和空间切片

**Acceptance:** 模块题目动态渲染；文字/语音二选一；切片确认后服务端能判定点位完成。

**Verify:** 三个组件的状态与校验测试；用户检查六类题目内容。

**Dependencies:** Task 7

**Files:** `DailySceneStep`、`EventStoryStep`、`SpaceSlicePreview`、点位页。

## Task 9: 接入三维房屋草稿状态

**Acceptance:** 返回分享页会刷新摘要；完成点位和房屋高度正确点亮；气泡展示完成状态。

**Verify:** 页面状态测试；用户真机检查旋转、缩放、滚动和返回刷新。

**Dependencies:** Task 8

**Files:** 分享页、`HouseExplorer`、`PointPromptBubble`、前端 API service。

## Task 10: 实现六点事务发布与安全门禁

**Acceptance:** 未完成时返回缺失模块；公开图片安全审核未通过时拒绝发布；完成后事务生成一次故事；重复请求返回既有故事 ID。

**Verify:** service 测试覆盖回滚和幂等；用户手工发布完整草稿。

**Dependencies:** Task 9

**Files:** 发布 route、草稿 service/repository、分享页。

## Task 11: 兼容新旧故事详情

**Acceptance:** 新故事显示空间切片，旧故事显示原正文照片；列表、收藏和历史仍读取封面与摘要。

**Verify:** 新旧详情映射测试；用户检查发现页、我的屋檐记、收藏和历史。

**Dependencies:** Task 10

**Files:** 共享合同、rental repository、详情页和 `SpaceRecordSection`。

## Task 12: 实现微打卡与连续居住判定

**Acceptance:** 所有者可创建打卡；服务端按三次、七天、两个时段判定；异常记录不计入。

**Verify:** 时间边界和所有权测试；用户跨日期数据验收。

**Dependencies:** Task 11

**Files:** check-in route、service、repository 及测试。

## Task 13: 增加凭证状态与可信依据展示

**Acceptance:** 公开接口仅返回可信标识；管理员核验后出现标识；私密 URL 不外泄。

**Verify:** 角色和响应过滤测试；用户检查详情页标识文案。

**Dependencies:** Task 12

**Files:** rental repository/service、共享合同、`TrustEvidence` 组件。

## Task 14: 接入家庭空间一致性分析

**Acceptance:** 可配置启用具体 AI provider；同一草稿照片作为受限参考集；结果归一化为一致、疑似、不确定或失败；疑似结果只触发复核，不自动判假。

**Verify:** provider contract、模型版本记录、超时重试、误判兜底和公开响应过滤测试。

**Dependencies:** Tasks 11-13

**Files:** 图片分析 adapter/service、任务 worker、审核映射及配置。
