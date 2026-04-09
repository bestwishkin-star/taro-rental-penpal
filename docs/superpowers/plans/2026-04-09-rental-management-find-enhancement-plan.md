# 实施计划：房源管理与找房体验增强

**关联 spec**: `docs/superpowers/specs/2026-04-09-rental-management-find-enhancement-design.md`
**日期**: 2026-04-09

---

## 阶段一：共享类型层

### Step 1 — 更新 `packages/shared/src/contracts/rental.ts`

- 新增 `RentalStatus = 'active' | 'inactive'`
- `RentalListing` 新增 `status: RentalStatus` 字段
- `ListRentalsQuery` 新增 `priceRange?: 'lt2000' | '2000to4000' | 'gt4000'`
- 新增 `UpdateRentalStatusInput { status: RentalStatus }`
- 在 `packages/shared/src/index.ts` 确认导出新类型

---

## 阶段二：后端

### Step 2 — `rental.repository.ts`：扩展 RentalRow + listMyRentals

- `RentalRow` 接口新增 `status: number`
- `listMyRentals` SELECT 语句补充 `status` 列，去掉 `status = 1` 条件（房东可查看所有状态）
- `listMyRentals` 返回值映射新增 `status: row.status === 1 ? 'active' : 'inactive'`
- 同理，`listRentals`、`getRentalById`、`listFavorites` 的返回值也补充 `status` 映射

### Step 3 — `rental.repository.ts`：新增 updateRentalStatus

```ts
export async function updateRentalStatus(
  id: string,
  openid: string,
  status: 0 | 1
): Promise<boolean>
```

- SQL: `UPDATE rentals SET status = ?, updated_at = NOW() WHERE id = ? AND user_openid = ?`
- 返回 `affectedRows > 0`（false 表示不存在或无权限）

### Step 4 — `rental.repository.ts`：扩展 listRentals 筛选

在 `listRentals` 的条件构建部分新增：
- `filter === 'single'` → `room_type = '单间'`
- `priceRange === 'lt2000'` → `CAST(price AS UNSIGNED) < 2000`
- `priceRange === '2000to4000'` → `CAST(price AS UNSIGNED) BETWEEN 2000 AND 4000`
- `priceRange === 'gt4000'` → `CAST(price AS UNSIGNED) > 4000`

### Step 5 — `rental.service.ts`：新增 updateRentalStatus

```ts
export async function changeRentalStatus(
  id: string,
  openid: string,
  status: RentalStatus
): Promise<boolean>
```

将 `'active'/'inactive'` 映射为 `1/0` 后调用 repository。

### Step 6 — 新建路由 `apps/backend/src/app/api/rentals/[id]/status/route.ts`

```ts
// PATCH /api/rentals/:id/status
// Auth: required
```

- 从 JWT 取 `openid`
- 调用 `changeRentalStatus(id, openid, body.status)`
- `false` → 返回 404
- 成功 → 返回 `ApiResponse<void>`

### Step 7 — `apps/backend/src/app/api/rentals/route.ts`：透传新参数

- GET handler 从 `searchParams` 取 `priceRange`，传入 `readRentals(query)`

---

## 阶段三：前端 API 层

### Step 8 — `apps/frontend/src/shared/api/rental.ts`

- `fetchRentals` 参数新增 `priceRange`、扩展 `filter` 类型（加 `'single'`）
- 新增 `updateRentalStatus(id: string, status: RentalStatus): Promise<ApiResponse<void>>`

---

## 阶段四：前端组件

### Step 9 — 新建 `shared/ui/EmptyState/`

```
shared/ui/EmptyState/
├── index.tsx
└── index.scss
```

Props: `message?: string`，`onReset?: () => void`（显示「清空筛选」按钮）

### Step 10 — `find/components/FilterChips/`：新增价格区间 + 房型

- 新增两组筛选数据：价格（4 选项）、房型（4 选项，含新增 `single`）
- 每组单选互斥，选中后回调父组件更新 `priceRange` / `filter` 状态
- 样式复用现有 chip 风格

### Step 11 — `find/index.tsx`：接入新筛选状态 + 空状态

- 新增 `priceRange` state，与 `filter`、`keyword`、`sort` 一起传入 `fetchRentals`
- 列表为空时渲染 `<EmptyState>` 组件，`onReset` 重置所有筛选状态

### Step 12 — `rental-list/`：mine 模式下的下架/上架操作

- `mine` 模式下，每张卡片增加操作按钮（下架 / 重新上架）
- 已下架卡片显示「已下架」角标（半透明蒙层或 badge）
- 点击后调用 `updateRentalStatus`，成功后本地更新该卡片的 `status` 状态（无需重新请求列表）

---

## 实施顺序

```
Step 1（类型）→ Step 2-7（后端）→ Step 8（前端 API）→ Step 9-12（前端组件）
```

后端各步骤可在 Step 1 完成后并行进行（Step 2-5 顺序依赖，Step 6-7 依赖 Step 5）。

---

## 注意事项

- `price` 字段格式需为纯数字字符串，价格区间筛选才有效；若格式不一致，发布表单需做约束
- 所有新增 import 遵守项目 ESLint import/order 规则（分组 + 字母序）
