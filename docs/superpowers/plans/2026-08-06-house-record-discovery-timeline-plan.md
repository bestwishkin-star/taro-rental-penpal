# 房屋实录发现与月度成长树 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将发现页改造成公开房屋实录内容流，并提供最近 30 天成长树和指定日期三维房屋快照浏览。

**Architecture:** 现有草稿和空间记录继续作为房主私有当前态，新增按自然日固化的公开快照表。后端通过独立的快照写服务和公开读服务提供发现、时间线和按日详情；前端复用 `HouseExplorer` 的 Three.js 场景，并将发现、成长树、模型拆成三个页面。

**Tech Stack:** Taro 4、React 18、TypeScript、Next.js 15 App Router、MySQL、Three.js、Vitest、pnpm workspace

**Execution note:** 按用户要求，代理编写测试代码和列出验证命令，但不运行小程序、构建或自动化测试；真机与运行验收由用户执行。

---

## 文件结构

### 共享合同

- Create: `packages/shared/src/contracts/house-record.ts` — 房屋实录列表、时间线、快照和发布状态合同。
- Modify: `packages/shared/src/index.ts` — 导出新合同。
- Modify: `packages/shared/src/errors.ts` — 增加稳定业务错误码（若当前错误码集中定义支持扩展）。

### 数据库与后端

- Create: `apps/backend/migrations/20260806_house_record_snapshots.sql` — 三张快照表、索引和旧数据初始化。
- Modify: `apps/backend/schema.sql` — 同步完整数据库结构。
- Create: `apps/backend/src/modules/house-records/house-record.types.ts` — repository 内部行类型和日期工具接口。
- Create: `apps/backend/src/modules/house-records/house-record-snapshot.repository.ts` — 事务写入和同日覆盖。
- Create: `apps/backend/src/modules/house-records/house-record-snapshot.service.ts` — 所有权、完整度和更新状态。
- Create: `apps/backend/src/modules/house-records/house-record.repository.ts` — 发现、时间线和按日快照查询。
- Create: `apps/backend/src/modules/house-records/house-record.service.ts` — 公开映射、照片过滤和可信依据聚合。
- Modify: `apps/backend/src/modules/rentals/rental-draft.repository.ts` — 首次发布事务写入初始快照。
- Modify: `apps/backend/src/modules/rentals/rental-draft.service.ts` — 首次发布返回快照日期。
- Create: `apps/backend/src/app/api/house-records/route.ts` — 发现列表。
- Create: `apps/backend/src/app/api/house-records/[rentalId]/timeline/route.ts` — 最近 30 天节点。
- Create: `apps/backend/src/app/api/house-records/[rentalId]/snapshots/[date]/route.ts` — 指定日期公开快照。
- Create: `apps/backend/src/app/api/rentals/[id]/snapshots/route.ts` — 房主主动更新当天快照。
- Create: `apps/backend/src/app/api/rentals/[id]/snapshot-status/route.ts` — 房主读取待更新状态。
- Modify: `apps/backend/package.json` — 增加 Vitest 测试脚本和依赖。
- Create: `apps/backend/src/modules/house-records/__tests__/house-record-date.test.ts` — 上海自然日与 30 天窗口。
- Create: `apps/backend/src/modules/house-records/__tests__/house-record-snapshot.service.test.ts` — 同日覆盖、跨日新增和权限。

### 前端

- Create: `apps/frontend/src/shared/api/house-record.ts` — 房屋实录 API service。
- Modify: `apps/frontend/src/shared/api/index.ts` — 统一导出。
- Modify: `apps/frontend/src/pages/find/index.tsx` — 切换到房屋实录列表。
- Modify: `apps/frontend/src/pages/find/index.scss` — 内容流布局。
- Replace: `apps/frontend/src/pages/find/components/RentalCard/index.tsx` — 改为 `HouseRecordCard` 组件目录。
- Create: `apps/frontend/src/pages/find/components/HouseRecordCard/index.tsx`
- Create: `apps/frontend/src/pages/find/components/HouseRecordCard/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/index.tsx`
- Create: `apps/frontend/src/pages/house-record/timeline/index.config.ts`
- Create: `apps/frontend/src/pages/house-record/timeline/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/components/GrowthTree/index.tsx`
- Create: `apps/frontend/src/pages/house-record/timeline/components/GrowthTree/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.tsx`
- Create: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/assets/images/growth-tree-scene.png`
- Create: `apps/frontend/src/assets/icons/house-record/node-blossom.png`
- Create: `apps/frontend/src/assets/icons/house-record/node-apple.png`
- Create: `apps/frontend/src/pages/house-record/model/index.tsx`
- Create: `apps/frontend/src/pages/house-record/model/index.config.ts`
- Create: `apps/frontend/src/pages/house-record/model/index.scss`
- Create: `apps/frontend/src/pages/house-record/model/components/SnapshotSpacePanel/index.tsx`
- Create: `apps/frontend/src/pages/house-record/model/components/SnapshotSpacePanel/index.scss`
- Create: `apps/frontend/src/shared/ui/house-explorer/` — 跨分包共享的 Three.js 场景、Canvas 手势和类型。
- Create: `apps/frontend/src/shared/assets/models/house-explorer/` — 跨分包共享的 GLB 模型资源。
- Modify: `apps/frontend/src/pages/share/components/HouseExplorer/index.tsx` — 改为编辑态包装层并复用共享场景。
- Modify: `apps/frontend/src/app.config.ts` — 注册时间线和模型分包路由。
- Modify: `apps/frontend/src/app.config.test.ts` — 断言新分包路由存在。
- Create: `apps/frontend/src/pages/house-record/__tests__/timeline-layout.test.ts` — 节点布局纯函数测试。

---

### Task 1: 定义共享合同与日期布局纯函数

**Files:**
- Create: `packages/shared/src/contracts/house-record.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/frontend/src/pages/house-record/timeline/timeline-layout.ts`
- Create: `apps/frontend/src/pages/house-record/__tests__/timeline-layout.test.ts`

- [ ] **Step 1: 编写时间线布局失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { createTimelineLayout } from '../timeline/timeline-layout';

describe('createTimelineLayout', () => {
  it('只为接口返回的日期生成节点并保持最新日期在顶部', () => {
    const result = createTimelineLayout([
      { snapshotDate: '2026-08-06', isLatest: true },
      { snapshotDate: '2026-08-03', isLatest: false }
    ]);
    expect(result.map((item) => item.snapshotDate)).toEqual(['2026-08-06', '2026-08-03']);
    expect(result).toHaveLength(2);
    expect(result[0].y).toBeLessThan(result[1].y);
  });
});
```

- [ ] **Step 2: 定义房屋实录合同**

```ts
import type {
  HouseModuleId,
  PublishedSpaceRecord,
  RentalTrustEvidence,
  RentalTrustLabel
} from './rental-space';

export type RentalSnapshotSource = 'MANUAL_UPDATE' | 'RANDOM_TASK' | 'SYSTEM';

export interface HouseRecordAuthor {
  nickname: string;
  avatar: string;
}

export interface HouseRecordListing {
  rentalId: string;
  title: string;
  contentPreview: string;
  coverPhoto?: string;
  author: HouseRecordAuthor;
  trustLabels: RentalTrustLabel[];
  recentUpdateCount: number;
  latestSnapshotDate: string;
  updatedAt: string;
}

export interface HouseRecordTimelineNode {
  snapshotDate: string;
  source: RentalSnapshotSource;
  updatedModules: HouseModuleId[];
  contentPreview?: string;
  coverPhoto?: string;
  isLatest: boolean;
}

export interface HouseRecordTimelineResponse {
  rentalId: string;
  title: string;
  author: HouseRecordAuthor;
  trustLabels: RentalTrustLabel[];
  rangeStart: string;
  rangeEnd: string;
  nodes: HouseRecordTimelineNode[];
}

export interface HouseRecordSnapshotResponse {
  rentalId: string;
  snapshotDate: string;
  source: RentalSnapshotSource;
  records: PublishedSpaceRecord[];
  trustEvidence: RentalTrustEvidence;
}

export interface HouseRecordSnapshotStatus {
  latestSnapshotDate?: string;
  currentUpdatedAt: string;
  hasUnpublishedChanges: boolean;
}
```

- [ ] **Step 3: 实现稳定节点布局**

```ts
const X_PATTERN = [164, 64, 236, 280, 116, 36, 208, 276];

export function createTimelineLayout<T extends { snapshotDate: string; isLatest: boolean }>(nodes: T[]) {
  return nodes.map((node, index) => ({
    ...node,
    x: X_PATTERN[index % X_PATTERN.length],
    y: 144 + index * 92,
    variant: node.isLatest || index % 6 === 5 ? ('apple' as const) : ('blossom' as const)
  }));
}
```

- [ ] **Step 4: 记录验证命令（由用户执行）**

```bash
pnpm --filter @rental-penpal/frontend test -- timeline-layout.test.ts
pnpm typecheck
```

- [ ] **Step 5: 提交共享合同**

```bash
git add packages/shared/src/contracts/house-record.ts packages/shared/src/index.ts apps/frontend/src/pages/house-record/timeline/timeline-layout.ts apps/frontend/src/pages/house-record/__tests__/timeline-layout.test.ts
git commit -m "feat(shared): 定义房屋实录公开快照合同"
```

### Task 2: 新增快照数据表和上海自然日工具

**Files:**
- Create: `apps/backend/migrations/20260806_house_record_snapshots.sql`
- Modify: `apps/backend/schema.sql`
- Create: `apps/backend/src/modules/house-records/house-record.types.ts`
- Create: `apps/backend/src/modules/house-records/house-record-date.ts`
- Create: `apps/backend/src/modules/house-records/__tests__/house-record-date.test.ts`
- Modify: `apps/backend/package.json`

- [ ] **Step 1: 为后端增加 Vitest 配置**

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: 编写自然日失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { getShanghaiDate, getTimelineRange } from '../house-record-date';

describe('house record date', () => {
  it('按 Asia/Shanghai 计算自然日', () => {
    expect(getShanghaiDate(new Date('2026-08-05T16:30:00.000Z'))).toBe('2026-08-06');
  });

  it('30 天窗口包含当天并向前 29 天', () => {
    expect(getTimelineRange('2026-08-06')).toEqual({ start: '2026-07-08', end: '2026-08-06' });
  });
});
```

- [ ] **Step 3: 创建三张快照表**

```sql
CREATE TABLE IF NOT EXISTS rental_public_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  owner_openid VARCHAR(64) NOT NULL,
  snapshot_date DATE NOT NULL,
  source VARCHAR(32) NOT NULL,
  title VARCHAR(120),
  content_preview VARCHAR(500),
  cover_photo_url VARCHAR(512),
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  UNIQUE KEY uk_rental_snapshot_date (rental_id, snapshot_date),
  INDEX idx_snapshot_rental_date (rental_id, snapshot_date),
  INDEX idx_snapshot_updated (updated_at)
);
```

同一迁移继续创建 `rental_public_snapshot_spaces` 和 `rental_public_snapshot_photos`，字段与设计规格完全一致，并在 `schema.sql` 同步。

- [ ] **Step 4: 实现日期工具**

```ts
export function getShanghaiDate(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

export function getTimelineRange(end: string) {
  const endAtNoon = new Date(`${end}T12:00:00+08:00`);
  endAtNoon.setUTCDate(endAtNoon.getUTCDate() - 29);
  return { start: getShanghaiDate(endAtNoon), end };
}
```

- [ ] **Step 5: 记录验证命令（由用户执行）**

```bash
pnpm --filter @rental-penpal/backend test -- house-record-date.test.ts
```

- [ ] **Step 6: 提交数据库结构**

```bash
git add apps/backend/package.json pnpm-lock.yaml apps/backend/migrations/20260806_house_record_snapshots.sql apps/backend/schema.sql apps/backend/src/modules/house-records/house-record.types.ts apps/backend/src/modules/house-records/house-record-date.ts apps/backend/src/modules/house-records/__tests__/house-record-date.test.ts
git commit -m "feat(database): 新增房屋实录每日快照结构"
```

### Task 3: 实现同日覆盖的快照写入服务

**Files:**
- Create: `apps/backend/src/modules/house-records/house-record-snapshot.repository.ts`
- Create: `apps/backend/src/modules/house-records/house-record-snapshot.service.ts`
- Create: `apps/backend/src/modules/house-records/__tests__/house-record-snapshot.service.test.ts`
- Modify: `apps/backend/src/modules/rentals/rental-draft.repository.ts`
- Modify: `apps/backend/src/modules/rentals/rental-draft.service.ts`

- [ ] **Step 1: 编写服务失败测试**

```ts
it('同一房屋同一天重复更新时覆盖原快照', async () => {
  const result = await publishCurrentHouseRecord('owner-1', 'rental-1', new Date('2026-08-06T08:00:00Z'));
  expect(result.snapshotDate).toBe('2026-08-06');
  expect(repository.replaceSnapshot).toHaveBeenCalledWith(expect.objectContaining({ rentalId: 'rental-1' }));
});
```

测试同时覆盖 `RENTAL_FORBIDDEN`、`RENTAL_NOT_PUBLISHED` 和 `SPACE_RECORD_INCOMPLETE`。

- [ ] **Step 2: 实现事务写入**

```ts
export async function replaceSnapshot(input: SnapshotWriteInput) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const snapshotId = await upsertSnapshotHeader(connection, input);
    await deleteSnapshotChildren(connection, snapshotId);
    await insertSnapshotSpaces(connection, snapshotId, input.records);
    await connection.commit();
    return snapshotId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

- [ ] **Step 3: 实现写服务校验**

`publishCurrentHouseRecord` 必须查询 `rental_story_drafts.published_rental_id` 确认所有权，读取六个完整空间，将 `PUBLIC` 且非 `REJECTED/REVIEW` 的照片复制到输入，使用 `getShanghaiDate()` 生成同日键。

- [ ] **Step 4: 接入首次发布事务**

在 `publishRentalDraftTransaction` 创建 `rentals` 并更新草稿状态的同一事务中写入 `SYSTEM` 初始快照。重复发布继续返回原 `rentalId`，不得生成第二份当天快照。

- [ ] **Step 5: 提交快照写服务**

```bash
git add apps/backend/src/modules/house-records apps/backend/src/modules/rentals/rental-draft.repository.ts apps/backend/src/modules/rentals/rental-draft.service.ts
git commit -m "feat(backend): 实现房屋实录每日快照写入"
```

### Task 4: 实现公开读取与房主更新 API

**Files:**
- Create: `apps/backend/src/modules/house-records/house-record.repository.ts`
- Create: `apps/backend/src/modules/house-records/house-record.service.ts`
- Create: `apps/backend/src/app/api/house-records/route.ts`
- Create: `apps/backend/src/app/api/house-records/[rentalId]/timeline/route.ts`
- Create: `apps/backend/src/app/api/house-records/[rentalId]/snapshots/[date]/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/snapshots/route.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/snapshot-status/route.ts`

- [ ] **Step 1: 实现公开查询**

发现查询按 `snapshot.updated_at DESC` 分页，每个房屋只取最新快照；时间线限定 `snapshot_date BETWEEN ? AND ?`，且数据库不存在的日期不会被补齐。

```sql
SELECT s.rental_id, s.snapshot_date, s.source, s.content_preview, s.cover_photo_url
FROM rental_public_snapshots s
INNER JOIN rentals r ON r.id = s.rental_id AND r.status = 'active'
WHERE s.rental_id = ? AND s.snapshot_date BETWEEN ? AND ?
ORDER BY s.snapshot_date DESC;
```

- [ ] **Step 2: 实现公开映射**

`readHouseRecordSnapshot` 从快照明细构造现有 `PublishedSpaceRecord[]`，不得回查当前草稿；可信依据可复用 `readPublishedRentalSpaces` 中的聚合逻辑，但照片与空间正文必须来自快照表。

- [ ] **Step 3: 实现路由参数校验**

```ts
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
if (!DATE_PATTERN.test(date)) return fail(BizCode.INVALID_PARAMS, '日期格式不正确');
```

公开 GET 不要求登录；两个房主接口复用 `verifyToken` 并传入 `payload.openid` 做所有权校验。

- [ ] **Step 4: 实现更新状态**

`hasUnpublishedChanges = currentDraftUpdatedAt > latestSnapshotUpdatedAt`。没有快照时返回 `true`；前端只根据该布尔值显示更新入口。

- [ ] **Step 5: 提交公开 API**

```bash
git add apps/backend/src/modules/house-records apps/backend/src/app/api/house-records apps/backend/src/app/api/rentals
git commit -m "feat(backend): 提供房屋实录发现与时间线接口"
```

### Task 5: 改造发现页为房屋实录内容流

**Files:**
- Create: `apps/frontend/src/shared/api/house-record.ts`
- Modify: `apps/frontend/src/shared/api/index.ts`
- Modify: `apps/frontend/src/pages/find/index.tsx`
- Modify: `apps/frontend/src/pages/find/index.scss`
- Create: `apps/frontend/src/pages/find/components/HouseRecordCard/index.tsx`
- Create: `apps/frontend/src/pages/find/components/HouseRecordCard/index.scss`
- Delete: `apps/frontend/src/pages/find/components/RentalCard/index.tsx`
- Delete: `apps/frontend/src/pages/find/components/RentalCard/index.scss`

- [ ] **Step 1: 添加 API service**

```ts
export function fetchHouseRecords(query?: { keyword?: string; page?: number; pageSize?: number }) {
  return httpRequest<HouseRecordListing[]>('/house-records', {
    params: compactParams(query)
  });
}

export function fetchHouseRecordTimeline(rentalId: string) {
  return httpRequest<HouseRecordTimelineResponse>(`/house-records/${rentalId}/timeline`, {
    params: { days: '30' }
  });
}
```

- [ ] **Step 2: 实现照片优先卡片**

`HouseRecordCard` 只展示封面、作者、正文片段、近 30 天更新次数和更新时间。没有封面时使用页面专属默认图，不展示价格、类型或标签筛选。

- [ ] **Step 3: 切换发现页数据源和导航**

```ts
<HouseRecordCard
  item={item}
  onClick={() => Taro.navigateTo({
    url: `/pages/house-record/timeline/index?rentalId=${item.rentalId}`
  })}
/>
```

- [ ] **Step 4: 提交发现页**

```bash
git add apps/frontend/src/shared/api apps/frontend/src/pages/find
git commit -m "feat(frontend): 改造发现页为房屋实录内容流"
```

### Task 6: 实现月度成长树页面

**Files:**
- Create: `apps/frontend/src/pages/house-record/timeline/index.tsx`
- Create: `apps/frontend/src/pages/house-record/timeline/index.config.ts`
- Create: `apps/frontend/src/pages/house-record/timeline/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/components/GrowthTree/index.tsx`
- Create: `apps/frontend/src/pages/house-record/timeline/components/GrowthTree/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.tsx`
- Create: `apps/frontend/src/pages/house-record/timeline/components/TimelineNode/index.scss`
- Create: `apps/frontend/src/pages/house-record/timeline/assets/images/growth-tree-scene.png`
- Create: `apps/frontend/src/assets/icons/house-record/node-blossom.png`
- Create: `apps/frontend/src/assets/icons/house-record/node-apple.png`
- Modify: `apps/frontend/src/app.config.ts`
- Modify: `apps/frontend/src/app.config.test.ts`

- [ ] **Step 1: 从 Pencil 设计稿准备资源**

从 `designs/house-record-growth-tree.pen` 导出花朵和苹果节点 2 倍 PNG 到 `apps/frontend/src/assets/icons/house-record/`；成长树场景使用 Pencil 生成的明亮版本并放到 timeline 页面专属 `assets/images/`。运行代码不引用 `designs/images`。

- [ ] **Step 2: 实现节点组件**

```tsx
export function TimelineNode({ node, x, y, variant, onClick }: Props) {
  return (
    <View
      className={`timeline-node timeline-node--${variant}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      hoverClass="timeline-node--pressed"
      ariaLabel={`${node.snapshotDate} 房屋实录`}
      onClick={onClick}
    >
      <Image src={variant === 'apple' ? appleAsset : blossomAsset} mode="aspectFit" />
      <Text>{formatShortDate(node.snapshotDate)}</Text>
    </View>
  );
}
```

- [ ] **Step 3: 实现长场景和真实节点列表**

`GrowthTree` 高度由 `max(844, 260 + nodes.length * 92)` 计算；只遍历接口返回的 `nodes`，不生成缺失日期。背景使用稳定宽高约束，节点层绝对定位，根容器由 `AppLayout` 统一滚动。

- [ ] **Step 4: 实现日期导航**

```ts
Taro.navigateTo({
  url: `/pages/house-record/model/index?rentalId=${rentalId}&snapshotDate=${node.snapshotDate}`
});
```

- [ ] **Step 5: 注册分包路由并提交**

```bash
git add apps/frontend/src/pages/house-record/timeline apps/frontend/src/assets/icons/house-record apps/frontend/src/app.config.ts apps/frontend/src/app.config.test.ts
git commit -m "feat(frontend): 新增房屋实录月度成长树"
```

### Task 7: 复用三维场景实现按日模型页

**Files:**
- Create: `apps/frontend/src/shared/ui/house-explorer/index.tsx`
- Create: `apps/frontend/src/shared/ui/house-explorer/index.scss`
- Create: `apps/frontend/src/shared/ui/house-explorer/types.ts`
- Create: `apps/frontend/src/shared/ui/house-explorer/HouseScene.ts`
- Create: `apps/frontend/src/shared/ui/house-explorer/house-layout.ts`
- Create: `apps/frontend/src/shared/ui/house-explorer/model-loader.ts`
- Create: `apps/frontend/src/shared/ui/house-explorer/text-decoder.ts`
- Create: `apps/frontend/src/shared/assets/models/house-explorer/`（迁移现有 GLB 与许可证）
- Modify: `apps/frontend/src/pages/share/components/HouseExplorer/index.tsx`
- Modify: `apps/frontend/src/pages/share/components/HouseExplorer/types.ts`
- Create: `apps/frontend/src/pages/house-record/model/index.tsx`
- Create: `apps/frontend/src/pages/house-record/model/index.config.ts`
- Create: `apps/frontend/src/pages/house-record/model/index.scss`
- Create: `apps/frontend/src/pages/house-record/model/components/SnapshotSpacePanel/index.tsx`
- Create: `apps/frontend/src/pages/house-record/model/components/SnapshotSpacePanel/index.scss`
- Modify: `apps/frontend/src/app.config.ts`

- [ ] **Step 1: 为 `HouseExplorer` 增加只读模式**

先把 `HouseScene`、Canvas 生命周期、手势控制和 GLB 加载器迁移到 `shared/ui/house-explorer`。共享组件只负责渲染模型与热点，不包含“去补充”文案；分享页包装层继续渲染 `PointPromptBubble`。

```ts
export interface HouseExplorerProps {
  modules: HouseModule[];
  selectedId: HouseModuleId | null;
  completion: number;
  mode?: 'edit' | 'readonly';
  onSelect: (id: HouseModuleId) => void;
  onDismiss?: () => void;
  onSupplement?: (id: HouseModuleId) => void;
  onWebglUnavailable?: () => void;
}
```

只读模式不渲染 `PointPromptBubble` 的补充入口，但保留热点选择、旋转和缩放。初始化捕获异常时调用 `onWebglUnavailable`。共享目录不得反向导入 `pages/share`。

- [ ] **Step 2: 实现按日快照加载**

页面验证 `rentalId` 和 `snapshotDate`，调用 `fetchHouseRecordSnapshot`，将六个 `PublishedSpaceRecord` 映射为 `HouseModule[]`，完成度固定由返回记录数计算而不是读取房主当前草稿。

- [ ] **Step 3: 实现空间公开信息面板**

选中热点后展示该日的 `publicPhotos`、`observations` 和 `eventText`。不提供编辑、补充、收藏或评论按钮。

- [ ] **Step 4: 实现 WebGL 降级**

`webglUnavailable` 为 `true` 时，按六空间顺序直接渲染 `SnapshotSpacePanel` 列表，保证模型失败仍可阅读当天内容。

- [ ] **Step 5: 提交按日模型页**

```bash
git add apps/frontend/src/shared/ui/house-explorer apps/frontend/src/shared/assets/models/house-explorer apps/frontend/src/pages/share/components/HouseExplorer apps/frontend/src/pages/house-record/model apps/frontend/src/app.config.ts
git commit -m "feat(frontend): 新增按日房屋模型快照页"
```

### Task 8: 在房主页面接入更新房屋实录

**Files:**
- Modify: `apps/frontend/src/shared/api/house-record.ts`
- Modify: `apps/frontend/src/pages/share/index.tsx`
- Modify: `apps/frontend/src/pages/share/index.scss`
- Create: `apps/frontend/src/pages/share/components/PublishSnapshotAction/index.tsx`
- Create: `apps/frontend/src/pages/share/components/PublishSnapshotAction/index.scss`

- [ ] **Step 1: 添加状态和发布请求**

```ts
export function fetchSnapshotStatus(rentalId: string) {
  return httpRequest<HouseRecordSnapshotStatus>(`/rentals/${rentalId}/snapshot-status`);
}

export function publishHouseRecordSnapshot(rentalId: string) {
  return httpRequest<{ snapshotDate: string }>(`/rentals/${rentalId}/snapshots`, { method: 'POST' });
}
```

- [ ] **Step 2: 实现更新操作组件**

仅当草稿已发布且 `hasUnpublishedChanges` 为真时显示“更新房屋实录”。确认后禁用按钮，成功时刷新草稿摘要和快照状态；失败时保留当前编辑状态并显示可重试提示。

- [ ] **Step 3: 修复已发布记录继续编辑的入口约束**

当前 `requireOwnedDraft` 拒绝 `PUBLISHED` 编辑。实现时必须明确采用“已发布草稿继续作为当前态”或“为已发布房屋创建新的 DRAFT 修订版”。本计划采用修订版：首次发布后由服务端幂等创建关联同一 `rentalId` 的新 `DRAFT`，后续空间编辑写入修订草稿，发布快照后继续复用该草稿而不改变 `rentals.id`。

- [ ] **Step 4: 提交房主更新入口**

```bash
git add apps/frontend/src/shared/api/house-record.ts apps/frontend/src/pages/share
git commit -m "feat(frontend): 接入房屋实录主动更新入口"
```

### Task 9: 兼容迁移和交付检查

**Files:**
- Modify: `apps/backend/migrations/20260806_house_record_snapshots.sql`
- Modify: `docs/superpowers/specs/2026-08-06-house-record-discovery-timeline-design.md`（仅当实现发现规格需澄清）
- Modify: `docs/superpowers/plans/2026-08-06-house-record-discovery-timeline-plan.md` — 勾选完成项。

- [ ] **Step 1: 增加旧数据初始化**

迁移只为满足以下条件的旧房屋生成 `SYSTEM` 快照：存在 `PUBLISHED` 草稿、关联活动 `rentals`、六个 `rental_space_records.completed_at` 均非空。其他旧故事保持原详情可读，但不进入 `/house-records`。

- [ ] **Step 2: 检查隐私字段**

人工审查公开 repository 的 SELECT 列，确认没有 `wechat`、核验专用 URL、凭证、精确位置或 `provider_payload`。

- [ ] **Step 3: 记录交付命令（由用户执行）**

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm --filter @rental-penpal/backend test
pnpm --filter @rental-penpal/frontend test
pnpm build:backend
pnpm build:frontend
```

- [ ] **Step 4: 提交兼容迁移与计划状态**

```bash
git add apps/backend/migrations/20260806_house_record_snapshots.sql docs/superpowers
git commit -m "chore(house-record): 完成房屋实录兼容迁移说明"
```
