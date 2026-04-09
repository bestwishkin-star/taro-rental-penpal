# 房源管理与找房体验增强 — 设计文档

**日期**: 2026-04-09
**状态**: 已批准

---

## 背景

当前项目已实现找房列表、房源详情、发布房源、我的页面等核心功能，但存在两个主要体验断点：

1. **房源管理缺失**：房东发布房源后无任何管理入口，无法下架或重新上架
2. **找房筛选不足**：缺少价格区间和房型两个高频筛选维度；搜索无结果时无空状态处理

---

## 范围

本次迭代包含三个子功能：

1. 房源下架 / 重新上架
2. 找房页新增价格区间 + 房型筛选
3. 找房页空状态处理

---

## 数据层

### MySQL 表

`rentals` 表的 `status` 字段已存在（`TINYINT(1) NOT NULL DEFAULT 1`），无需改表：
- `1` = 上架（active）
- `0` = 下架（inactive）

### 共享类型（`packages/shared/src/contracts/rental.ts`）

```ts
export type RentalStatus = 'active' | 'inactive';

// RentalListing 新增 status 字段
export interface RentalListing {
  id: string;
  title: string;
  location: string;
  price: string;
  area: string;
  roomType: string;
  tags: string[];
  photos: string[];
  status: RentalStatus;  // 新增
}

// ListRentalsQuery 新增筛选参数
export interface ListRentalsQuery {
  keyword?: string;
  filter?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  priceRange?: 'lt2000' | '2000to4000' | 'gt4000';  // 新增
  // roomType 不新增，复用现有 filter 参数（扩展 'single' 选项）
}

// 更新房源状态的请求体
export interface UpdateRentalStatusInput {
  status: RentalStatus;
}
```

---

## 后端 API

### 新增：下架 / 上架接口

```
PATCH /api/rentals/:id/status
Authorization: Bearer <token>（必须）
Body: UpdateRentalStatusInput
Response: ApiResponse<void>
```

**实现要点**：
- `rental.repository.ts` 新增 `updateRentalStatus(id: string, openid: string, status: 0 | 1)`
- SQL：`UPDATE rentals SET status = ?, updated_at = NOW() WHERE id = ? AND user_openid = ?`
- 用 `user_openid` 做鉴权，防止操作他人房源；若影响行数为 0，返回 404
- `listMyRentals` 目前固定查 `status = 1`，需改为查询所有状态（去掉 status 条件），房东才能看到已下架的房源并重新上架
- `RentalRow` 接口需新增 `status: number` 字段，SELECT 语句需补充 `status` 列

### 扩展：找房列表接口

`GET /api/rentals` 新增查询参数 `priceRange` 和 `roomType`：

**`priceRange` 过滤逻辑**（`rental.repository.ts` 的 `listRentals`）：
```sql
-- priceRange=lt2000
AND CAST(price AS UNSIGNED) < 2000

-- priceRange=2000to4000
AND CAST(price AS UNSIGNED) BETWEEN 2000 AND 4000

-- priceRange=gt4000
AND CAST(price AS UNSIGNED) > 4000
```

> 注：`price` 字段需为纯数字字符串（如 `"3500"`）。若存在带单位的格式，`CAST` 会截断到第一个非数字字符，筛选结果可能不准确，届时需在发布表单层做格式约束。

**`roomType` 过滤逻辑**：

现有 `filter` 参数已支持 `whole`（整租）和 `shared`（合租），逻辑在 `rental.repository.ts:98-106`。不新增 `roomType` 参数，改为复用并扩展 `filter`：

| filter 值 | SQL 条件 |
|---|---|
| `whole` | `room_type = '整租'`（已有） |
| `shared` | `room_type = '合租'`（已有） |
| `single` | `room_type = '单间'`（新增） |
| `subway` | `JSON_SEARCH(tags, 'one', '交通便利') IS NOT NULL`（已有） |

共享类型中的 `ListRentalsQuery.roomType` 字段**不需要新增**，前端直接传 `filter=single`。

---

## 前端变更

### 1. 「我的发布」列表 — 下架 / 上架

**位置**：`pages/rental-list/` 在 `mine` 模式下

**交互**：
- 每张卡片右下角增加操作按钮
  - 上架中 → 「下架」按钮
  - 已下架 → 「重新上架」按钮
- 点击后调用 `PATCH /api/rentals/:id/status`，成功后本地更新卡片状态（无需重新请求列表）
- 已下架的卡片加「已下架」角标作为视觉区分（半透明蒙层或角标）

### 2. 找房页 — 新增筛选维度

**位置**：`pages/find/components/FilterChips/`

在现有 FilterChips 行扩充两组：

| 组 | 选项 |
|---|---|
| 价格 | 不限 / 2000以下 / 2000-4000 / 4000以上 |
| 房型 | 不限 / 整租 / 合租 / 单间 |

**规则**：
- 每组内单选，互斥
- 选中后将 `priceRange` / `roomType` 拼入 `fetchRentals` 请求参数
- 与 keyword、sort 联动，任意条件变更触发重新请求

### 3. 找房页 — 空状态

**位置**：新建 `shared/ui/EmptyState/`（跨页面可复用）

**触发条件**：`listRentals` 返回 `total = 0`

**展示内容**：
- 插图（从 Pencil 设计稿导出，或使用占位图）
- 文案：「暂无符合条件的房源」
- 「清空筛选」按钮：重置 keyword、filter、priceRange、roomType、sort 为默认值，重新请求

---

## 不在本次范围内

- 房源编辑（修改内容）
- 房源删除
- 地图找房
- 聊天 / 联系房东

---

## 文件变更清单

| 文件 | 变更类型 |
|---|---|
| `packages/shared/src/contracts/rental.ts` | 修改（新增类型） |
| `apps/backend/src/modules/rentals/rental.repository.ts` | 修改（新增方法、扩展查询） |
| `apps/backend/src/modules/rentals/rental.service.ts` | 修改（新增 service 方法） |
| `apps/backend/src/app/api/rentals/[id]/status/route.ts` | 新建（PATCH 路由） |
| `apps/backend/src/app/api/rentals/route.ts` | 修改（透传新查询参数） |
| `apps/frontend/src/pages/find/components/FilterChips/` | 修改（新增两组筛选） |
| `apps/frontend/src/pages/find/index.tsx` | 修改（新增状态 + 空状态渲染） |
| `apps/frontend/src/pages/rental-list/` | 修改（mine 模式加操作按钮） |
| `apps/frontend/src/shared/ui/EmptyState/` | 新建（空状态组件） |
| `apps/frontend/src/shared/api/rental.ts` | 修改（新增 updateRentalStatus、扩展 fetchRentals 参数） |
