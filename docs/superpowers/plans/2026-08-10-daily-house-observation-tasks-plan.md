# 每日房屋观察随机任务 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已发布房屋提供每日一个可更换一次的随机观察任务，完成后追加不可变观察、更新房主当前事实，并按隐私与审核状态更新当天公开快照和成长树。

**Architecture:** 新增 `daily-tasks` 后端业务域，使用规则模板、加权选择器、正式 MySQL migration 和事务型事实投影。共享合同驱动 Taro 任务分包页面；房主模型读取 owner 事实叠加结果，公开模型继续只读取按日 public 快照，图片异步审核通过后再推进 public 指针。

**Tech Stack:** Taro 4、React 18、TypeScript、Next.js 15 App Router、MySQL 8、Zod、Vitest、pnpm workspace、Pencil

**Execution note:** 按项目约定，实施者先写测试代码，但不代替用户运行测试、构建、开发服务或真机验收。每个验证步骤均标注为“用户执行”。当前工作区已有未提交修复，实施前必须先由用户按原业务内容处理，禁止混入本计划提交。

---

## 文件结构

### 共享合同

- Create: `packages/shared/src/contracts/daily-task.ts`：任务、答案、事实、活跃度和 API 输入输出合同。
- Modify: `packages/shared/src/index.ts`：导出每日任务合同。
- Modify: `packages/shared/src/errors.ts`：增加 1310-1320 每日任务业务码。

### 数据库与后端

- Create: `apps/backend/migrations/20260810_create_daily_observation_tasks.sql`：模板、任务、观察、事实值、事实指针、快照活动和拍摄挑战扩展。
- Modify: `apps/backend/schema.sql`：同步最终数据库结构。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.types.ts`：数据库行与内部命令类型。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.templates.ts`：首期 24 个版本化规则模板。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.selector.ts`：候选过滤、权重和可重放选择。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.selector.test.ts`：冷却、时段、空间重复与权重测试。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.repository.ts`：任务、观察、事实和活动的数据库操作。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.service.ts`：今日任务、开始、更换、完成和活跃度编排。
- Create: `apps/backend/src/modules/daily-tasks/daily-task.service.test.ts`：权限、幂等、自然日和状态机测试。
- Create: `apps/backend/src/modules/daily-tasks/daily-task-projection.service.ts`：owner/public 双指针和快照投影。
- Create: `apps/backend/src/modules/daily-tasks/daily-task-projection.service.test.ts`：隐私与审核推进测试。
- Create: `apps/backend/src/modules/daily-tasks/daily-task-events.ts`：不含隐私内容的结构化事件。
- Modify: `apps/backend/src/modules/house-records/house-record-snapshot.repository.ts`：允许在同一连接中从 public fact heads 重建当天快照。
- Modify: `apps/backend/src/modules/house-records/house-record.repository.ts`：时间线聚合 snapshot activities。
- Modify: `apps/backend/src/modules/house-records/house-record.service.ts`：输出公开、私密活动和审核节点状态。
- Modify: `apps/backend/src/modules/house-records/house-record.service.test.ts`：私密节点和审核状态测试。
- Modify: `apps/backend/src/modules/photo-analysis/photo-analysis.service.ts`：审核完成后刷新待发布任务投影。
- Modify: `apps/backend/src/modules/rentals/rental-capture-challenge.repository.ts`：拍摄挑战支持绑定 draft 或 daily task。
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/today/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/start/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/replace/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/photo-challenge/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/complete/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/activity-summary/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/space-facts/route.ts`

### 前端与设计资源

- Create locally, do not stage: `designs/daily-house-observation-tasks.pen`：375px 首页入口、任务揭晓、四类任务和完成反馈设计。
- Create: `apps/frontend/src/assets/icons/daily-task/*.png`：从 Pencil 以 2 倍 PNG 导出的任务图标和完成反馈素材。
- Create: `apps/frontend/src/shared/api/daily-task.ts`：每日任务 API service。
- Modify: `apps/frontend/src/shared/api/index.ts`：导出 API。
- Create: `apps/frontend/src/pages/home/components/DailyObservationEntry/index.tsx`
- Create: `apps/frontend/src/pages/home/components/DailyObservationEntry/index.scss`
- Modify: `apps/frontend/src/pages/home/index.tsx`：组合今日任务入口。
- Create: `apps/frontend/src/pages/daily-task/index.tsx`：只负责加载、步骤状态和提交编排。
- Create: `apps/frontend/src/pages/daily-task/index.config.ts`
- Create: `apps/frontend/src/pages/daily-task/index.scss`
- Create: `apps/frontend/src/pages/daily-task/task-form-state.ts`
- Create: `apps/frontend/src/pages/daily-task/task-form-state.test.ts`
- Create: `apps/frontend/src/pages/daily-task/components/{TaskIntro,TimedObservationTask,PhotoEvidenceTask,QuickMeasurementTask,DailyEventTask,TaskVisibilityControl,TaskReplacementSheet,TaskCompletionSummary}/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/{TaskIntro,TimedObservationTask,PhotoEvidenceTask,QuickMeasurementTask,DailyEventTask,TaskVisibilityControl,TaskReplacementSheet,TaskCompletionSummary}/index.scss`
- Modify: `apps/frontend/src/app.config.ts`：注册 daily-task 分包。
- Modify: `apps/frontend/src/app.config.test.ts`：断言分包路由。
- Modify: `apps/frontend/src/pages/share/index.tsx`：页面显示时刷新 owner facts 并接收更新空间参数。
- Modify: `apps/frontend/src/pages/share/components/HouseExplorer/index.tsx`：向场景传递新鲜度和一次性高亮空间。
- Modify: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.tsx`：渲染公开、私密、审核中和仅房主可见状态。
- Modify: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.scss`

---

### Task 1: 完成 Pencil 任务体验与切图

**Files:**
- Create locally, do not stage: `designs/daily-house-observation-tasks.pen`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-clock.png`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-camera.png`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-measure.png`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-event.png`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-replace.png`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-private.png`
- Create: `apps/frontend/src/assets/icons/daily-task/icon-public.png`
- Create: `apps/frontend/src/assets/icons/daily-task/task-complete-glow.png`

- [ ] **Step 1: 在 Pencil 创建 375px 设计稿**

设计 6 个画板：`首页-待完成`、`任务揭晓`、`定时观察`、`现场照片`、`测量与事件`、`完成反馈`。任务表单使用全宽页面流，不使用嵌套卡片；底部操作区遵循 `AppLayout` 安全区；任务类型用切图图标，不使用 emoji、字体图标或 Lucide。

- [ ] **Step 2: 导出资源**

使用 `mcp__pencil__export_nodes`，参数固定为 `format: "png"`、`scale: 2`，输出到 `apps/frontend/src/assets/icons/daily-task/`。逐个核对透明背景、2 倍尺寸和语义化文件名。

- [ ] **Step 3: 记录用户视觉验收**

由用户直接查看 `.pen` 文件确认字号、色彩、任务步骤和完成反馈。未确认前不进入前端样式实现。

- [ ] **Step 4: 提交切图，不提交 designs**

```bash
git add apps/frontend/src/assets/icons/daily-task
git commit -m "feat(frontend): 新增每日观察任务视觉资源"
```

### Task 2: 定义共享合同与业务错误码

**Files:**
- Create: `packages/shared/src/contracts/daily-task.ts`
- Modify: `packages/shared/src/errors.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 定义稳定枚举和联合类型**

```ts
import type { HouseModuleId, PhotoCaptureChallenge } from './rental-space';

/** 每日观察任务类型。 */
export type DailyTaskType = 'TIMED_OBSERVATION' | 'PHOTO_EVIDENCE' | 'QUICK_MEASUREMENT' | 'DAILY_EVENT';
/** 任务实例状态；公开审核状态与任务完成状态相互独立。 */
export type DailyTaskStatus = 'ASSIGNED' | 'STARTED' | 'REPLACED' | 'COMPLETED' | 'EXPIRED';
/** 观察内容的公开范围。 */
export type DailyTaskVisibility = 'PRIVATE' | 'PUBLIC';
/** 公开事实投影状态。 */
export type PublicProjectionStatus = 'NOT_REQUESTED' | 'PENDING' | 'PUBLISHED' | 'REJECTED';
/** 用户更换任务时必须选择的私密原因。 */
export type DailyTaskReplacementReason = 'NOT_AT_HOME' | 'SPACE_UNAVAILABLE' | 'TIME_UNSUITABLE' | 'PRIVACY_CONCERN' | 'OTHER';

export interface DailyTaskQuestion {
  id: string;
  label: string;
  kind: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'NUMBER' | 'SHORT_TEXT';
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  unit?: string;
}

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

export interface DailyTaskTodayResponse {
  task?: DailyTaskDetail;
  completedToday: boolean;
  activeDays: number;
  latestSnapshotDate?: string;
}

export interface CompleteDailyTaskInput {
  idempotencyKey: string;
  answers: Record<string, string | string[] | number>;
  measurementValues: Record<string, number>;
  photoAssetIds: string[];
  challengeId?: string;
  conclusionVisibility: DailyTaskVisibility;
  photoVisibility: DailyTaskVisibility;
  observedAt: string;
}

export interface CompleteDailyTaskResult {
  taskId: string;
  snapshotDate: string;
  updatedModule: HouseModuleId;
  updatedFactKeys: string[];
  freshnessPercent: number;
  publicProjectionStatus: PublicProjectionStatus;
}

export interface DailyTaskActivitySummary {
  rangeStart: string;
  rangeEnd: string;
  activeDays: number;
  publicDays: number;
  privateDays: number;
  latestCompletedDate?: string;
  moduleFreshness: Partial<Record<HouseModuleId, string>>;
}

export interface OwnerSpaceFactSummary {
  module: HouseModuleId;
  freshnessPercent: number;
  facts: Array<{ key: string; label: string; value: string; observedAt: string }>;
}

export type DailyTaskPhotoChallenge = PhotoCaptureChallenge;
```

- [ ] **Step 2: 增加 1310-1320 错误码**

```ts
DAILY_TASK_NOT_FOUND: 1310,
DAILY_TASK_EXPIRED: 1311,
DAILY_TASK_ALREADY_COMPLETED: 1312,
REPLACEMENT_LIMIT_REACHED: 1313,
TASK_TIMER_TOO_SHORT: 1314,
TASK_EVIDENCE_REQUIRED: 1315,
PHOTO_CHALLENGE_EXPIRED: 1316,
PHOTO_CONTENT_REUSED: 1317,
TASK_TEMPLATE_VERSION_UNAVAILABLE: 1318,
TASK_COMPLETION_CONFLICT: 1319,
DAILY_TASK_NOT_STARTED: 1320,
```

为每个 code 在 `BizMessage` 添加具体中文说明，并在 `packages/shared/src/index.ts` 增加 `export * from './contracts/daily-task';`。

- [ ] **Step 3: 用户执行类型检查**

```bash
pnpm typecheck
```

Expected: shared、backend、frontend 均无新增 TypeScript 错误。

- [ ] **Step 4: 提交合同**

```bash
git add packages/shared/src/contracts/daily-task.ts packages/shared/src/errors.ts packages/shared/src/index.ts
git commit -m "feat(shared): 定义每日房屋观察任务合同"
```

### Task 3: 创建正式数据库迁移

**Files:**
- Create: `apps/backend/migrations/20260810_create_daily_observation_tasks.sql`
- Modify: `apps/backend/schema.sql`

- [ ] **Step 1: 创建任务与观察核心表**

```sql
CREATE TABLE rental_daily_task_templates (
  id VARCHAR(36) NOT NULL,
  version INT NOT NULL,
  generator_type ENUM('RULE', 'AI') NOT NULL DEFAULT 'RULE',
  generator_version VARCHAR(32) NOT NULL,
  policy_version VARCHAR(32) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  task_type VARCHAR(32) NOT NULL,
  title VARCHAR(120) NOT NULL,
  prompt VARCHAR(500) NOT NULL,
  explanation_template VARCHAR(500) NOT NULL,
  estimated_seconds INT NOT NULL,
  allowed_periods JSON NOT NULL,
  evidence_requirement JSON NOT NULL,
  question_schema JSON NOT NULL,
  fact_mapping JSON NOT NULL,
  cooldown_days INT NOT NULL DEFAULT 14,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id, version),
  KEY idx_daily_template_active (active, module_type, task_type)
);

CREATE TABLE rental_daily_tasks (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  owner_openid VARCHAR(64) NOT NULL,
  task_date DATE NOT NULL,
  slot TINYINT NOT NULL,
  template_id VARCHAR(36) NOT NULL,
  template_version INT NOT NULL,
  status VARCHAR(24) NOT NULL,
  assignment_reason VARCHAR(500) NOT NULL,
  weight_snapshot JSON NOT NULL,
  replacement_reason VARCHAR(32),
  replacement_note VARCHAR(200),
  parent_task_id VARCHAR(36),
  started_at DATETIME(3),
  expires_at DATETIME(3) NOT NULL,
  completed_at DATETIME(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_daily_task_rental_date_slot (rental_id, task_date, slot),
  UNIQUE KEY uk_daily_task_owner_date_slot (owner_openid, task_date, slot),
  KEY idx_daily_task_template_history (rental_id, template_id, task_date)
);

CREATE TABLE rental_task_observations (
  id VARCHAR(36) PRIMARY KEY,
  task_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  owner_openid VARCHAR(64) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  task_date DATE NOT NULL,
  idempotency_key VARCHAR(64) NOT NULL,
  answers JSON NOT NULL,
  measurement_values JSON NOT NULL,
  photo_asset_ids JSON NOT NULL,
  conclusion_visibility VARCHAR(16) NOT NULL,
  photo_visibility VARCHAR(16) NOT NULL,
  integrity_status VARCHAR(24) NOT NULL,
  safety_status VARCHAR(24) NOT NULL,
  household_status VARCHAR(24) NOT NULL,
  public_projection_status VARCHAR(24) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_task_observation_task (task_id),
  UNIQUE KEY uk_task_observation_idempotency (owner_openid, idempotency_key)
);
```

- [ ] **Step 2: 创建事实与活动表**

```sql
CREATE TABLE rental_space_fact_values (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  fact_key VARCHAR(96) NOT NULL,
  fact_label VARCHAR(120) NOT NULL,
  normalized_value JSON NOT NULL,
  source_observation_id VARCHAR(36) NOT NULL,
  visibility VARCHAR(16) NOT NULL,
  integrity_status VARCHAR(24) NOT NULL,
  observed_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_fact_value_rental_module (rental_id, module_type, fact_key)
);

CREATE TABLE rental_space_fact_heads (
  rental_id VARCHAR(36) NOT NULL,
  module_type VARCHAR(32) NOT NULL,
  fact_key VARCHAR(96) NOT NULL,
  owner_fact_value_id VARCHAR(36) NOT NULL,
  public_fact_value_id VARCHAR(36),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (rental_id, module_type, fact_key)
);

CREATE TABLE rental_snapshot_activities (
  id VARCHAR(36) PRIMARY KEY,
  snapshot_id VARCHAR(36) NOT NULL,
  rental_id VARCHAR(36) NOT NULL,
  activity_date DATE NOT NULL,
  source VARCHAR(32) NOT NULL,
  visibility VARCHAR(16) NOT NULL,
  module_type VARCHAR(32),
  task_id VARCHAR(36),
  projection_status VARCHAR(24) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_snapshot_activity_task (task_id),
  KEY idx_snapshot_activity_timeline (rental_id, activity_date)
);
```

使用 `INFORMATION_SCHEMA` 守卫为 `photo_capture_challenges` 增加可空的 `daily_task_id` 与 `template_version`，并将 `draft_id` 改为可空；数据库约束保证 `draft_id` 和 `daily_task_id` 恰有一个非空。将相同最终结构同步到 `schema.sql`，不新增任何 `ensure*Schema()` 运行时建表函数。

- [ ] **Step 3: 用户执行 migration 并核对**

```sql
SHOW TABLES LIKE 'rental_daily_tasks';
SHOW INDEX FROM rental_daily_tasks;
SHOW COLUMNS FROM rental_task_observations;
SHOW COLUMNS FROM photo_capture_challenges;
```

Expected: 六张新表存在，两个 task 唯一索引存在，挑战表支持 `daily_task_id`。

- [ ] **Step 4: 提交 migration**

```bash
git add apps/backend/migrations/20260810_create_daily_observation_tasks.sql apps/backend/schema.sql
git commit -m "feat(database): 新增每日房屋观察任务数据结构"
```

### Task 4: 实现模板库与可重放加权选择器

**Files:**
- Create: `apps/backend/src/modules/daily-tasks/daily-task.types.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task.templates.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task.selector.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task.selector.test.ts`

- [ ] **Step 1: 编写选择器测试**

```ts
import { describe, expect, it } from 'vitest';
import { selectDailyTaskTemplate } from './daily-task.selector';

describe('selectDailyTaskTemplate', () => {
  it('排除十四天内使用过的模板和连续第三天的同一空间', () => {
    const result = selectDailyTaskTemplate({
      templates: fixtureTemplates,
      taskDate: '2026-08-10',
      period: 'EVENING',
      recentTemplateIds: ['bedroom-noise'],
      recentModules: ['bedroom', 'bedroom'],
      staleDaysByFact: { 'kitchen.ventilation': 18 },
      seed: 'rental-1:2026-08-10:0'
    });
    expect(result.template.id).toBe('kitchen-ventilation');
    expect(result.candidates.every((item) => item.templateId !== 'bedroom-noise')).toBe(true);
  });
});
```

- [ ] **Step 2: 定义选择器纯函数边界**

```ts
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

export interface DailyTaskSelection {
  template: DailyTaskTemplate;
  assignmentReason: string;
  candidates: Array<{ templateId: string; weight: number; reasons: string[] }>;
}
```

实现稳定字符串 seed、候选过滤和累计权重抽取。权重由 `1 + min(staleDays, 30) + uncoveredBonus + periodBonus - repetitionPenalty` 组成，最终最小为 1；返回完整候选快照供任务实例持久化。

- [ ] **Step 3: 建立首期 24 个模板**

每个空间四个模板，四类任务各至少一个；每个模板必须声明 `id`、`version`、`dimension`、`questionSchema`、`factMapping`、时段、最短时长和证据要求。所有常量、类型、映射函数和关键权重步骤添加中文注释。

- [ ] **Step 4: 用户执行选择器测试**

```bash
pnpm --filter @rental-penpal/backend test -- daily-task.selector.test.ts
```

Expected: 固定 seed 结果稳定，冷却、时段和空间重复用例通过。

- [ ] **Step 5: 提交模板与选择器**

```bash
git add apps/backend/src/modules/daily-tasks/daily-task.types.ts apps/backend/src/modules/daily-tasks/daily-task.templates.ts apps/backend/src/modules/daily-tasks/daily-task.selector.ts apps/backend/src/modules/daily-tasks/daily-task.selector.test.ts
git commit -m "feat(backend): 实现每日观察模板加权抽取"
```

### Task 5: 实现今日任务、开始与活跃度接口

**Files:**
- Create: `apps/backend/src/modules/daily-tasks/daily-task.repository.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task.service.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task.service.test.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task-events.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/today/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/start/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/activity-summary/route.ts`

- [ ] **Step 1: 编写 Service 失败测试**

```ts
it('同日并发唯一键冲突后回读已生成的 slot 0 任务', async () => {
  vi.mocked(findDailyTaskBySlot).mockResolvedValueOnce(null).mockResolvedValueOnce(existingTask);
  vi.mocked(insertDailyTask).mockRejectedValueOnce(duplicateKeyError);
  await expect(getOrCreateTodayTask('owner-1', 'rental-1', now)).resolves.toMatchObject({ id: 'task-1' });
});

it('定时任务重复开始时返回第一次 startedAt', async () => {
  vi.mocked(markTaskStarted).mockResolvedValue({ ...existingTask, startedAt: '2026-08-10T10:00:00.000Z' });
  await expect(startDailyTask('owner-1', 'rental-1', 'task-1')).resolves.toMatchObject({ startedAt: '2026-08-10T10:00:00.000Z' });
});
```

- [ ] **Step 2: 实现 repository 原子操作**

提供 `getPublishedOwnedRental`、`findDailyTaskBySlot`、`listRecentTaskHistory`、`insertDailyTask`、`markTaskStarted`、`getActivitySummary`。所有日期 SQL 使用显式 `task_date`，Service 通过现有 `getShanghaiDate()` 传入上海自然日，不使用客户端日期。

- [ ] **Step 3: 实现 Service 与路由**

```ts
export async function getOrCreateTodayTask(ownerOpenid: string, rentalId: string, now = new Date()): Promise<DailyTaskTodayResponse>;
export async function startDailyTask(ownerOpenid: string, rentalId: string, taskId: string, now = new Date()): Promise<DailyTaskDetail>;
export async function readDailyTaskActivity(ownerOpenid: string, rentalId: string, days = 30, now = new Date()): Promise<DailyTaskActivitySummary>;
```

路由统一复用 `verifyToken`、`ok`、`fail`、`handleError`。事件只记录 rentalId、taskId、templateId、候选数量、状态和错误码，不记录答案、照片 URL、replacement note 或事实值。

- [ ] **Step 4: 用户执行后端测试**

```bash
pnpm --filter @rental-penpal/backend test -- daily-task.service.test.ts
```

Expected: 权限、并发幂等、上海自然日、开始计时和活跃度用例通过。

- [ ] **Step 5: 提交核心查询接口**

```bash
git add apps/backend/src/modules/daily-tasks apps/backend/src/app/api/rentals/[id]/daily-task/today apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/start apps/backend/src/app/api/rentals/[id]/activity-summary
git commit -m "feat(backend): 提供每日观察任务查询与开始接口"
```

### Task 6: 实现不可变观察与 owner/public 事实投影

**Files:**
- Create: `apps/backend/src/modules/daily-tasks/daily-task-projection.service.ts`
- Create: `apps/backend/src/modules/daily-tasks/daily-task-projection.service.test.ts`
- Modify: `apps/backend/src/modules/daily-tasks/daily-task.repository.ts`
- Modify: `apps/backend/src/modules/house-records/house-record-snapshot.repository.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/space-facts/route.ts`

- [ ] **Step 1: 编写隐私投影测试**

```ts
it('私密观察只推进 owner head', async () => {
  const result = await projectObservation(privateObservation, fixtureTemplate, connection);
  expect(result.ownerFactKeys).toEqual(['bedroom.nightNoise']);
  expect(result.publicFactKeys).toEqual([]);
  expect(upsertFactHead).toHaveBeenCalledWith(expect.objectContaining({ publicFactValueId: undefined }));
});

it('需要照片佐证的公开事实审核中时不推进 public head', async () => {
  const result = await projectObservation(pendingPhotoObservation, fixtureTemplate, connection);
  expect(result.publicProjectionStatus).toBe('PENDING');
  expect(rebuildPublicSnapshot).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 实现字段映射白名单**

```ts
export function mapObservationToFacts(
  observation: RentalTaskObservation,
  template: DailyTaskTemplate
): NormalizedFactValue[] {
  return template.factMapping.map((mapping) => normalizeMappedFact(mapping, observation));
}
```

`normalizeMappedFact` 只接受模板版本声明的 questionId、数值范围和目标 factKey；客户端不能提交 factKey。每次写入新 fact value，`owner_head` 总是推进；`public_head` 仅在结论公开且所需证据审核通过时推进。

- [ ] **Step 3: 提取可复用快照重建入口**

```ts
export async function replaceSnapshotFromPublicFactsWithConnection(
  connection: PoolConnection,
  input: { rentalId: string; ownerOpenid: string; snapshotDate: string; source: 'RANDOM_TASK' }
): Promise<{ snapshotId: string }>;
```

该函数读取当前草稿作为六空间基线，用 public heads 按 `fact_key` 覆盖对应 `scene_answers/observations`，再复用现有同日快照写入。私密活动也创建当天快照，但内容仅为当时 public heads 的投影。

- [ ] **Step 4: 提供房主事实接口**

`GET /api/rentals/:id/space-facts` 只允许房主访问，返回六空间 owner head 摘要、新鲜度和 observedAt；不返回原始观察、私密照片 URL 或内部审核原因。

- [ ] **Step 5: 用户执行投影测试**

```bash
pnpm --filter @rental-penpal/backend test -- daily-task-projection.service.test.ts
```

Expected: 私密、公开、审核中和拒绝四种推进规则通过。

- [ ] **Step 6: 提交事实投影**

```bash
git add apps/backend/src/modules/daily-tasks/daily-task-projection.service.ts apps/backend/src/modules/daily-tasks/daily-task-projection.service.test.ts apps/backend/src/modules/daily-tasks/daily-task.repository.ts apps/backend/src/modules/house-records/house-record-snapshot.repository.ts apps/backend/src/app/api/rentals/[id]/space-facts
git commit -m "feat(backend): 建立房屋观察事实双指针投影"
```

### Task 7: 实现完成任务事务

**Files:**
- Modify: `apps/backend/src/modules/daily-tasks/daily-task.service.ts`
- Modify: `apps/backend/src/modules/daily-tasks/daily-task.service.test.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/complete/route.ts`

- [ ] **Step 1: 编写事务与幂等测试**

```ts
it('重复幂等键返回第一次完成结果且不新增观察', async () => {
  vi.mocked(findObservationByIdempotencyKey).mockResolvedValue(existingObservation);
  await expect(completeDailyTask(command)).resolves.toEqual(existingResult);
  expect(insertObservationWithConnection).not.toHaveBeenCalled();
});

it('快照写入失败时回滚观察、事实和任务状态', async () => {
  vi.mocked(replaceSnapshotFromPublicFactsWithConnection).mockRejectedValue(new Error('snapshot failed'));
  await expect(completeDailyTask(command)).rejects.toThrow('snapshot failed');
  expect(connection.rollback).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: 实现完成命令校验**

使用 Zod 校验 `CompleteDailyTaskInput`；锁定 task 行后校验所有权、COMPLETED 幂等、上海自然日、expiresAt、计时秒数、问题 schema、测量范围和证据要求。`observedAt` 转为 MySQL `Date` 参数写入，禁止把 ISO 字符串直接写入 DATETIME。

- [ ] **Step 3: 按固定顺序实现事务**

```ts
await connection.beginTransaction();
const task = await lockDailyTask(connection, command.taskId);
const observation = await insertImmutableObservation(connection, validatedInput);
const projection = await projectObservation(observation, task.template, connection);
const snapshot = await replaceSnapshotFromPublicFactsWithConnection(connection, snapshotInput);
await appendSnapshotActivity(connection, activityInput);
await markTaskCompleted(connection, task.id, now);
await connection.commit();
```

catch 中 rollback，finally release。若照片审核中，任务仍为 COMPLETED，观察 `public_projection_status=PENDING`，owner head 立即更新。

- [ ] **Step 4: 用户执行完成事务测试**

```bash
pnpm --filter @rental-penpal/backend test -- daily-task.service.test.ts
```

Expected: 幂等、过期、计时不足、缺证据、DATETIME 参数和整笔回滚用例通过。

- [ ] **Step 5: 提交完成事务**

```bash
git add apps/backend/src/modules/daily-tasks/daily-task.service.ts apps/backend/src/modules/daily-tasks/daily-task.service.test.ts apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/complete
git commit -m "feat(backend): 实现每日观察任务完成事务"
```

### Task 8: 接入照片挑战、唯一替换与异步审核

**Files:**
- Modify: `apps/backend/src/modules/rentals/rental-capture-challenge.repository.ts`
- Modify: `apps/backend/src/modules/daily-tasks/daily-task.repository.ts`
- Modify: `apps/backend/src/modules/daily-tasks/daily-task.service.ts`
- Modify: `apps/backend/src/modules/daily-tasks/daily-task.service.test.ts`
- Modify: `apps/backend/src/modules/photo-analysis/photo-analysis.service.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/replace/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/photo-challenge/route.ts`

- [ ] **Step 1: 编写替换和审核测试**

```ts
it('每天只允许创建 slot 1 且排除原维度', async () => {
  await replaceDailyTask('owner-1', 'rental-1', 'task-0', { reason: 'TIME_UNSUITABLE' });
  expect(insertDailyTask).toHaveBeenCalledWith(expect.objectContaining({ slot: 1 }));
  expect(selectDailyTaskTemplate).toHaveBeenCalledWith(expect.objectContaining({ excludedDimension: 'night-noise' }));
});

it('照片审核通过后推进对应 public head 并重建原任务日期快照', async () => {
  await refreshPendingTaskProjections('asset-1');
  expect(promotePublicFactHeads).toHaveBeenCalled();
  expect(rebuildPublicSnapshot).toHaveBeenCalledWith(expect.objectContaining({ snapshotDate: '2026-08-10' }));
});
```

- [ ] **Step 2: 扩展一次性拍摄挑战**

保留现有 draft 调用签名，新增 `createDailyTaskCaptureChallenge` 和 `consumeDailyTaskCaptureChallenge`；原子消费条件包含 owner、taskId、module、templateVersion、expiresAt 和 usedAt。照片任务完成时还需验证 photo asset 所有权与 content hash 未被该 owner 的其他任务观察使用。

- [ ] **Step 3: 实现唯一替换**

只允许 ASSIGNED 状态替换。事务中锁定 slot 0、写入私密原因、标记 REPLACED 并创建 slot 1；遇到唯一键冲突时回读 slot 1，不创建第三个任务。

- [ ] **Step 4: 连接图片审核回调**

`photo-analysis.service.ts` 更新 photo asset 状态后调用 `refreshPendingTaskProjections(assetId)`。审核通过推进依赖该图片的 public heads；拒绝时将观察和 activity 标记为 REJECTED，不改 public heads。

- [ ] **Step 5: 用户执行混合证据测试**

```bash
pnpm --filter @rental-penpal/backend test -- daily-task.service.test.ts daily-task-projection.service.test.ts
```

Expected: 唯一替换、挑战原子消费、重复图片拒绝、审核推进和拒绝用例通过。

- [ ] **Step 6: 提交证据与替换能力**

```bash
git add apps/backend/src/modules/rentals/rental-capture-challenge.repository.ts apps/backend/src/modules/daily-tasks apps/backend/src/modules/photo-analysis/photo-analysis.service.ts apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/replace apps/backend/src/app/api/rentals/[id]/daily-task/[taskId]/photo-challenge
git commit -m "feat(backend): 接入观察任务证据审核与唯一替换"
```

### Task 9: 扩展成长树活动状态

**Files:**
- Modify: `packages/shared/src/contracts/house-record.ts`
- Modify: `apps/backend/src/modules/house-records/house-record.repository.ts`
- Modify: `apps/backend/src/modules/house-records/house-record.service.ts`
- Modify: `apps/backend/src/modules/house-records/house-record.service.test.ts`

- [ ] **Step 1: 编写私密节点测试**

```ts
it('私密活动只暴露匿名节点状态', async () => {
  vi.mocked(listTimelineActivities).mockResolvedValue([{ snapshotDate: '2026-08-10', hasPrivateActivity: true, publicChangeCount: 0, projectionStatus: 'NOT_REQUESTED' }]);
  const result = await readHouseRecordTimeline('rental-1', 30, now);
  expect(result.nodes[0]).toMatchObject({ activityState: 'PRIVATE_ACTIVITY', updatedModules: [] });
  expect(result.nodes[0]).not.toHaveProperty('privateChangeCount');
});
```

- [ ] **Step 2: 扩展公开合同**

```ts
export type HouseRecordActivityState = 'PUBLIC_UPDATE' | 'PRIVATE_ACTIVITY' | 'REVIEW_PENDING' | 'REVIEW_REJECTED_OWNER_ONLY';

export interface HouseRecordTimelineNode {
  snapshotDate: string;
  source: RentalSnapshotSource;
  activityState: HouseRecordActivityState;
  updatedModules: HouseModuleId[];
  hasPrivateActivity: boolean;
  isLatest: boolean;
}
```

- [ ] **Step 3: 批量聚合 activity**

Repository 对 30 天范围执行一次活动查询，Service 按 snapshotDate 合并；私密节点不返回 module、题目、答案、照片或数量。节点点击仍导航到该日公开 snapshot。

- [ ] **Step 4: 用户执行时间线测试**

```bash
pnpm --filter @rental-penpal/backend test -- house-record.service.test.ts
```

Expected: 公开、私密、审核中和拒绝状态均不泄露私密字段。

- [ ] **Step 5: 提交成长树合同与接口**

```bash
git add packages/shared/src/contracts/house-record.ts apps/backend/src/modules/house-records/house-record.repository.ts apps/backend/src/modules/house-records/house-record.service.ts apps/backend/src/modules/house-records/house-record.service.test.ts
git commit -m "feat(house-record): 扩展成长树观察活动状态"
```

### Task 10: 实现前端 API、路由与纯状态逻辑

**Files:**
- Create: `apps/frontend/src/shared/api/daily-task.ts`
- Modify: `apps/frontend/src/shared/api/index.ts`
- Modify: `apps/frontend/src/app.config.ts`
- Modify: `apps/frontend/src/app.config.test.ts`
- Create: `apps/frontend/src/pages/daily-task/task-form-state.ts`
- Create: `apps/frontend/src/pages/daily-task/task-form-state.test.ts`

- [ ] **Step 1: 编写分包和状态测试**

```ts
it('registers the daily task subpackage page', async () => {
  const config = await loadAppConfig();
  expect(config.subPackages?.find((item) => item.root === 'pages/daily-task')?.pages).toContain('index');
});

it('照片任务在缺少 challenge 和 asset 时不可提交', () => {
  expect(validateTaskDraft(photoTask, emptyDraft)).toEqual({ valid: false, reason: '请先完成现场拍摄' });
});
```

- [ ] **Step 2: 实现 API service**

```ts
export const fetchTodayDailyTask = (rentalId: string) => httpRequest<DailyTaskTodayResponse>(`/rentals/${rentalId}/daily-task/today`);
export const startDailyTask = (rentalId: string, taskId: string) => httpRequest<DailyTaskDetail>(`/rentals/${rentalId}/daily-task/${taskId}/start`, { method: 'POST' });
export const replaceDailyTask = (rentalId: string, taskId: string, body: ReplaceDailyTaskInput) => httpRequest<DailyTaskDetail, ReplaceDailyTaskInput>(`/rentals/${rentalId}/daily-task/${taskId}/replace`, { method: 'POST', body });
export const completeDailyTask = (rentalId: string, taskId: string, body: CompleteDailyTaskInput) => httpRequest<CompleteDailyTaskResult, CompleteDailyTaskInput>(`/rentals/${rentalId}/daily-task/${taskId}/complete`, { method: 'POST', body });
export const fetchOwnerSpaceFacts = (rentalId: string) => httpRequest<OwnerSpaceFactSummary[]>(`/rentals/${rentalId}/space-facts`);
```

- [ ] **Step 3: 实现纯状态函数**

`createTaskDraft(task)`、`validateTaskDraft(task, draft)`、`buildCompleteInput(draft, idempotencyKey)` 和 `restoreTaskDraft(taskId)` 不依赖 React；草稿存储键包含 taskId，网络失败保留同一 idempotencyKey，完成或过期后清理。

- [ ] **Step 4: 用户执行前端单测**

```bash
pnpm --filter @rental-penpal/frontend test -- app.config.test.ts task-form-state.test.ts
```

Expected: 分包、四类任务校验、草稿恢复和幂等键用例通过。

- [ ] **Step 5: 提交前端基础能力**

```bash
git add apps/frontend/src/shared/api apps/frontend/src/app.config.ts apps/frontend/src/app.config.test.ts apps/frontend/src/pages/daily-task/task-form-state.ts apps/frontend/src/pages/daily-task/task-form-state.test.ts
git commit -m "feat(frontend): 接入每日观察任务接口与状态逻辑"
```

### Task 11: 实现首页入口与原子化任务页面

**Files:**
- Create: `apps/frontend/src/pages/home/components/DailyObservationEntry/index.tsx`
- Create: `apps/frontend/src/pages/home/components/DailyObservationEntry/index.scss`
- Modify: `apps/frontend/src/pages/home/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/index.config.ts`
- Create: `apps/frontend/src/pages/daily-task/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/TaskIntro/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/TaskIntro/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/TimedObservationTask/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/TimedObservationTask/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/PhotoEvidenceTask/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/PhotoEvidenceTask/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/QuickMeasurementTask/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/QuickMeasurementTask/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/DailyEventTask/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/DailyEventTask/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/TaskVisibilityControl/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/TaskVisibilityControl/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/TaskReplacementSheet/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/TaskReplacementSheet/index.scss`
- Create: `apps/frontend/src/pages/daily-task/components/TaskCompletionSummary/index.tsx`
- Create: `apps/frontend/src/pages/daily-task/components/TaskCompletionSummary/index.scss`

- [ ] **Step 1: 实现首页入口**

`DailyObservationEntry` 在 `useDidShow` 先复用 `fetchMyRentals()` 查找当前用户状态为已发布的房屋，再用该 rentalId 刷新今日任务；未登录、没有已发布 rental 或接口返回 `RENTAL_NOT_PUBLISHED` 时不渲染。待完成展示目标空间、预计耗时、有效期和更换次数；完成后展示 activeDays 和“查看更新后的房屋”。首期若用户存在多套已发布房屋，按 `updatedAt` 选择最近更新的一套，避免首页同时出现多个主任务；多房屋切换不在本期范围内。

- [ ] **Step 2: 实现页面编排**

```tsx
<AppLayout mode="list" contentClassName="daily-task-page">
  <TaskIntro task={task} />
  {task.type === 'TIMED_OBSERVATION' && <TimedObservationTask task={task} draft={draft} onChange={setDraft} />}
  {task.type === 'PHOTO_EVIDENCE' && <PhotoEvidenceTask task={task} draft={draft} onChange={setDraft} />}
  {task.type === 'QUICK_MEASUREMENT' && <QuickMeasurementTask task={task} draft={draft} onChange={setDraft} />}
  {task.type === 'DAILY_EVENT' && <DailyEventTask task={task} draft={draft} onChange={setDraft} />}
  <TaskVisibilityControl draft={draft} onChange={setDraft} />
</AppLayout>
```

页面入口只管理 `loading/error/task/draft/step/submitting`。每个业务组件拥有独立 SCSS 和 `daily-task-*` BEM 类名；所有图标使用 Pencil PNG；底部操作区在滚动内容末尾并由 `AppLayout` 维护安全区。

- [ ] **Step 3: 实现计时与前后台行为**

开始计时后保存服务端 `startedAt`，界面剩余时间由 `Date.now() - startedAt` 计算，不依赖递减计数器。`useDidShow` 重新请求任务，防止小程序切后台后计时漂移。

- [ ] **Step 4: 实现完成反馈与导航**

成功后渲染 `TaskCompletionSummary`，显示 updatedModule、freshnessPercent 和 publicProjectionStatus；点击查看房屋导航到 `/pages/share/index?updatedModule=<module>&snapshotDate=<date>`。

- [ ] **Step 5: 用户手工验收页面**

在微信开发者工具检查 375px、414px 和真机安全区；验证页面可上下滚动、底部按钮不遮挡、前后台计时正确、网络失败草稿保留、任务完成后首页立即刷新。

- [ ] **Step 6: 提交任务页面**

```bash
git add apps/frontend/src/pages/home apps/frontend/src/pages/daily-task
git commit -m "feat(frontend): 新增每日房屋观察任务交互"
```

### Task 12: 联动房主模型与成长树反馈

**Files:**
- Modify: `apps/frontend/src/pages/share/index.tsx`
- Modify: `apps/frontend/src/pages/share/components/HouseExplorer/index.tsx`
- Modify: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.tsx`
- Modify: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.scss`
- Modify: `apps/frontend/src/pages/house-record/timeline/index.tsx`

- [ ] **Step 1: 房主页面刷新 owner facts**

`pages/share/index.tsx` 在 `useDidShow` 调用 `fetchOwnerSpaceFacts(rentalId)`；将每个空间新鲜度传给 `HouseExplorer`。`updatedModule` 仅触发一次亮光扩散，播放后清除本地触发标记，避免每次渲染重复动画。

- [ ] **Step 2: 扩展成长树节点状态**

`PUBLIC_UPDATE` 使用公开果实，`PRIVATE_ACTIVITY` 使用未展开花苞，`REVIEW_PENDING` 使用柔和脉冲外圈，`REVIEW_REJECTED_OWNER_ONLY` 只在房主视图出现。私密节点点击仍打开公开模型，并显示“这一天留下了一条未公开的居住观察”。

- [ ] **Step 3: 保持手势和页面滚动边界**

HouseExplorer 继续沿用现有触摸锁：单指落在 3D 区域时旋转模型且阻止页面滚动，双指缩放；触点离开模型区域后恢复 `AppLayout` 滚动。新增高亮不得改变 canvas 尺寸或重新创建 renderer。

- [ ] **Step 4: 用户真机验收联动**

完成私密和公开任务各一次，确认房主模型立即变化、公开模型只显示 public heads、同日只有一个成长节点、节点状态正确、3D 手势不会带动页面滚动。

- [ ] **Step 5: 提交联动反馈**

```bash
git add apps/frontend/src/pages/share apps/frontend/src/pages/house-record/timeline
git commit -m "feat(frontend): 联动观察任务房屋模型与成长树"
```

### Task 13: 完成全链路验收与提交检查

**Files:**
- Review only: 本计划涉及的全部文件

- [ ] **Step 1: 用户执行后端测试与类型检查**

```bash
pnpm --filter @rental-penpal/backend test
pnpm --filter @rental-penpal/backend typecheck
```

Expected: 全部 Vitest 通过，TypeScript 无错误。

- [ ] **Step 2: 用户执行前端测试与类型检查**

```bash
pnpm --filter @rental-penpal/frontend test
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: 全部 Vitest 通过，Taro 页面合同无类型错误。

- [ ] **Step 3: 用户执行微信开发者工具验收**

覆盖：首次生成、并发刷新、更换一次、第二次更换拒绝、四类任务、前后台计时、午夜过期、网络重试幂等、私密任务、公开任务、照片审核中/通过/拒绝、同日手动更新共存、另一账号查看私密节点、模型旋转缩放和页面滚动。

- [ ] **Step 4: 检查提交边界**

```bash
git status --short
git log --oneline -15
git diff --check HEAD~12..HEAD
```

Expected: 每个 commit 只有一个逻辑内容，消息符合 `<type>(<scope>): <中文说明>`；`designs/`、构建产物、环境文件和无关修复未被提交。

---

## 实施顺序与停点

1. Task 1-7 构成首个可用闭环：定时观察任务可生成、开始、完成并更新 owner/public 投影。
2. Task 8 增加照片真实性、唯一替换和异步审核，完成混合证据能力。
3. Task 9-12 完成成长树、首页、任务页面和 3D 房屋反馈。
4. 每个 Task 完成后单独提交；用户反馈不通过时只修复当前 Task，不提前进入下一 Task。
5. Task 13 由用户执行验证，实施代理只根据用户返回的结果修复，不自行启动测试或开发服务。
