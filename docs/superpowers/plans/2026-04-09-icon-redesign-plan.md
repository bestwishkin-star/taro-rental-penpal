# 实施计划：全站图标重设计

**关联 spec**: `docs/superpowers/specs/2026-04-09-icon-redesign-design.md`
**日期**: 2026-04-09

---

## 阶段一：Pencil 设计稿更新

### Step 1 — 在 `pencil-new.pen` 中更新各页面图标节点

**目标**：将所有 emoji 文字节点替换为 `icon_font`，并确保图标容器样式符合规范。

**Home Screen (`lpr3a`)**：
- 找房 ActionCard：找到 emoji 图标节点，替换为 `icon_font` `search`（`#C67A52`，22×22），底框确认渐变 Warm（`#F8EDD8 → #F0C0A0`，r14，48×48）
- 分享 ActionCard：替换为 `icon_font` `send`（`#C67A52`，22×22），同上底框

**Profile Screen (`Ule81`)**：
- 我的发布（`xJO0I`）：将 emoji `📋` 文字节点替换为 `icon_font` `file-text`（`#C67A52`，22×22）
- 我的收藏（`TvONJ`）：emoji `❤️` → `icon_font` `heart`（`#5A9040`，22×22）
- 浏览历史（`rF0QW`）：emoji `🕐` → `icon_font` `alarm-clock`（`#2E7FC0`，22×22）
- 设置（`DIizd`）：emoji `⚙️` → `icon_font` `settings`（`#C67A52`，22×22）

**Share Screen (`knttP`)**：
- 核查 `circle-dollar-sign` → 改为 `dollar-sign`（`#C17F4A`，18×18）
- 核查 `message-circle` → 改为 `message-square`（`#C17F4A`，18×18）
- 其余表单图标（map-pin / house / square / plus / chevron-right ×2 / shield-check / send）核查颜色和尺寸符合规范

**Find Screen (`u7v5n`)**：
- 核查 search（灰色 `#9A9A9A`，16×16）、sliders-horizontal（白色，18×18）、chevron-down（×3，`#3A2E1E` / `#6B6B6B`，14×16）

**Rental Detail Screen (`nnlkS`)**：
- 核查 chevron-left（`#3A2E1E`，22×22）

---

## 阶段二：从 Pencil 导出图标 PNG

### Step 2 — 导出组 1 功能图标（7 个，含底框）

使用 `mcp__pencil__export_nodes`，`scale: 2`，`format: "png"`。

| 节点 | 导出路径 |
|------|---------|
| Home 找房 ActionCard 图标容器 | `apps/frontend/src/assets/icons/home/icon-find.png` |
| Home 分享 ActionCard 图标容器 | `apps/frontend/src/assets/icons/home/icon-share.png` |
| Profile 我的发布 图标容器 (`uGluC`) | `apps/frontend/src/assets/icons/profile/icon-publish.png` |
| Profile 我的收藏 图标容器 (`r2IkY`) | `apps/frontend/src/assets/icons/profile/icon-favorite.png` |
| Profile 浏览历史 图标容器 (`H4eKv`) | `apps/frontend/src/assets/icons/profile/icon-history.png` |
| Profile 设置 图标容器 (`lIWDT`) | `apps/frontend/src/assets/icons/profile/icon-settings.png` |
| 登录锁 图标容器（新建，参照规范） | `apps/frontend/src/assets/icons/common/icon-lock.png` |

### Step 3 — 导出组 2 Tab 栏图标（3×2 = 6 张）

分别找到 Tab Bar 中各 tab 的 inactive 和 active icon_font 节点：

| 节点 | 颜色 | 导出路径 |
|------|------|---------|
| home tab inactive | `#9A9A9A` | `apps/frontend/src/assets/icons/tab/home.png` |
| home tab active | `#FFFFFF` | `apps/frontend/src/assets/icons/tab/home-active.png` |
| find tab inactive | `#9A9A9A` | `apps/frontend/src/assets/icons/tab/find.png` |
| find tab active | `#FFFFFF` | `apps/frontend/src/assets/icons/tab/find-active.png` |
| profile tab inactive | `#9A9A9A` | `apps/frontend/src/assets/icons/tab/profile.png` |
| profile tab active | `#FFFFFF` | `apps/frontend/src/assets/icons/tab/profile-active.png` |

### Step 4 — 导出组 3 表单图标（6 张）

从 Share Screen 各 FormRow 图标节点导出，覆盖现有文件：

| 节点 | 导出路径 |
|------|---------|
| dollar-sign (`#C17F4A`) | `apps/frontend/src/assets/icons/share/icon-price.png` |
| map-pin (`#C17F4A`) | `apps/frontend/src/assets/icons/share/icon-location.png` |
| house (`#C17F4A`) | `apps/frontend/src/assets/icons/share/icon-house.png` |
| square (`#C17F4A`) | `apps/frontend/src/assets/icons/share/icon-area.png` |
| message-square (`#C17F4A`) | `apps/frontend/src/assets/icons/share/icon-wechat.png` |
| plus (`#C17F4A`) | `apps/frontend/src/assets/icons/share/icon-add.png` |

### Step 5 — 导出组 4 通用 UI 图标（8 张）

| 节点 | 导出路径 |
|------|---------|
| chevron-left (`#3A2E1E`，22×22) | `apps/frontend/src/assets/icons/common/icon-back.png` |
| chevron-right (`#C5BAB0`，16×16) | `apps/frontend/src/assets/icons/common/icon-chevron-right.png` |
| chevron-down (`#3A2E1E`，16×16) | `apps/frontend/src/assets/icons/find/icon-chevron-down.png` |
| sliders-horizontal (`#FFFFFF`，18×18) | `apps/frontend/src/assets/icons/find/icon-filter-btn.png` |
| search (`#9A9A9A`，16×16) | `apps/frontend/src/assets/icons/find/icon-search.png` |
| lock small (`#8B7355`，16×16) | `apps/frontend/src/assets/icons/common/icon-lock-sm.png` |
| x (`#3A2E1E`，14×14) | `apps/frontend/src/assets/icons/common/icon-close.png` |
| heart (`#C17F4A`，22×22) | `apps/frontend/src/assets/icons/common/icon-heart.png` |

---

## 阶段三：代码更新

### Step 6 — 创建缺失的资产目录

```
apps/frontend/src/assets/icons/home/       (新建)
apps/frontend/src/assets/icons/profile/    (新建)
apps/frontend/src/assets/icons/common/     (新建)
```

### Step 7 — 更新 `pages/home/components/ActionCard/index.tsx`

- 接收 `icon: string`（图片路径）prop 替代现有 emoji prop
- 渲染 `<Image src={icon} className="action-card__icon" mode="aspectFit" />`
- 删除 emoji 文字节点；`›` 箭头替换为 `<Image src={iconChevronRight} className="action-card__arrow" mode="aspectFit" />`
- 更新对应 SCSS：`.action-card__icon { width: 48px; height: 48px; }` `.action-card__arrow { width: 16px; height: 16px; }`

### Step 8 — 更新 `pages/home/index.tsx`

- import `iconFind` from `@/assets/icons/home/icon-find.png`
- import `iconShare` from `@/assets/icons/home/icon-share.png`
- import `iconChevronRight` from `@/assets/icons/common/icon-chevron-right.png`
- 将两个 ActionCard 的图标 prop 改为对应 import

### Step 9 — 更新 `pages/profile/components/ProfileMenuItem/index.tsx`

- 接收 `icon: string` prop 替代 emoji
- 渲染 `<Image src={icon} className="profile-menu-item__icon" mode="aspectFit" />`
- `›` 箭头替换为 `<Image src={iconChevronRight} className="profile-menu-item__arrow" mode="aspectFit" />`
- 更新 SCSS：`.profile-menu-item__icon { width: 48px; height: 48px; }` `.profile-menu-item__arrow { width: 16px; height: 16px; }`

### Step 10 — 更新 `pages/profile/index.tsx`

- import 4 个 profile 图标 PNG
- import `iconChevronRight`
- 4 个 ProfileMenuItem 的图标 prop 改为对应 import

### Step 11 — 更新 `shared/ui/login-modal/index.tsx`

- import `iconLock` from `@/assets/icons/common/icon-lock.png`
- `🔒` emoji 替换为 `<Image src={iconLock} className="login-modal__icon" mode="aspectFit" />`
- SCSS：`.login-modal__icon { width: 48px; height: 48px; }`

### Step 12 — 更新 `pages/share/index.tsx`

- import `iconLockSm` from `@/assets/icons/common/icon-lock-sm.png`
- 匿名提示处的 `🔒` emoji → `<Image src={iconLockSm} className="icon-lock-sm" mode="aspectFit" />`
- SCSS：`.icon-lock-sm { width: 16px; height: 16px; }`

### Step 13 — 更新 `pages/share/components/FormRow/index.tsx`

- `›` 箭头替换为 `<Image src={iconChevronRight} className="form-row__arrow" mode="aspectFit" />`
- SCSS：`.form-row__arrow { width: 16px; height: 16px; }`

### Step 14 — 更新 `pages/share/components/PhotoUploader/index.tsx`

- `×` 关闭按钮 → `<Image src={iconClose} className="photo-uploader__remove-icon" mode="aspectFit" />`
- SCSS：`.photo-uploader__remove-icon { width: 14px; height: 14px; }`

### Step 15 — 更新 `pages/rental-detail/index.tsx`

- import `iconHeart` from `@/assets/icons/common/icon-heart.png`
- 收藏按钮的 `♡` 文字 → `<Image src={iconHeart} className="detail-fav__icon" mode="aspectFit" />`
- SCSS：`.detail-fav__icon { width: 22px; height: 22px; }`

### Step 16 — 更新 `pages/share/index.tsx` & `pages/rental-detail/index.tsx` 导航栏返回按钮

- import `iconBack` from `@/assets/icons/common/icon-back.png`
- chevron-left icon_font → `<Image src={iconBack} className="nav__back-icon" mode="aspectFit" />`
- SCSS：`.nav__back-icon { width: 22px; height: 22px; }`

### Step 17 — 覆盖 Tab 栏、Find 页现有 PNG（路径不变，文件更新）

- `custom-tab-bar`：文件覆盖，代码路径不变
- `find/components/SearchBar`：`icon-search.png` 覆盖
- `find/components/SortBar`：`icon-chevron-down.png` 覆盖
- `pages/share/index.tsx` 各表单图标 PNG 覆盖

---

## 阶段四：验收

### Step 18 — 视觉检查

- 使用 `/document-skills:webapp-testing` 截图各页面，对照设计稿逐图标确认
- 检查各图标在 HiDPI（2x）屏上无模糊
- 检查深色背景上白色图标（Tab active）的显示

### Step 19 — 类型检查 & Lint

```bash
pnpm typecheck
pnpm lint
```

---

## 执行顺序总结

```
阶段一（Pencil）→ 阶段二（导出 PNG）→ 阶段三 Step 6（建目录）
→ Step 7-8（Home）→ Step 9-10（Profile）→ Step 11（LoginModal）
→ Step 12-14（Share）→ Step 15-16（Detail & NavBar）
→ Step 17（覆盖现有 PNG）→ Step 18-19（验收）
```
