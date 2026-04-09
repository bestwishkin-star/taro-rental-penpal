# 全站图标重设计 — 设计文档

**日期**: 2026-04-09
**状态**: 已批准

---

## 背景

当前项目图标使用方式混乱，分三类问题：

1. **代码中用 emoji**：Profile 菜单、Home 动作卡、登录弹窗使用 🏠 ❤️ 👀 ⚙️ 📋 🔒 等 emoji，跨平台渲染不一致、视觉风格与 App 整体暖棕色调不搭
2. **代码中用文字字符**：`›`（右箭头）、`×`（关闭按钮）作为 UI 图标
3. **Pencil 设计稿全部用 icon_font（lucide）**：设计稿与 CLAUDE.md 规范（"从 Pencil 切图使用"）不符；即便导出 PNG 也无法控制容器样式

## 目标

- 所有图标统一为 **从 Pencil 导出的 PNG 文件**，代码中用 `<Image>` 渲染
- Pencil 设计稿中所有 `icon_font` 节点替换为 **规范的图标节点**（渐变底框 + icon_font 符号 / 独立 icon_font），成为真正的切图源
- 视觉风格统一为 **Style A**：渐变圆角方形底 + lucide 线条符号（功能图标），纯 icon_font 无底框（导航/表单图标）

---

## 图标分组与规格

### 组 1 — 功能图标（Style A，渐变底框）

用于 Profile 菜单、Home 动作卡、登录弹窗。导出单位：整个图标容器（含底框）。

| 图标名 | 位置 | Lucide 符号 | 底框渐变 | 图标颜色 | 导出尺寸 |
|--------|------|------------|---------|---------|---------|
| icon-publish | Profile / 我的发布 | `file-text` | `#F8EDD8 → #F0C0A0`（225°） | `#C67A52` | 48×48 @2x |
| icon-favorite | Profile / 我的收藏 | `heart` | `#E8F0D8 → #D4E8B0`（225°） | `#5A9040` | 48×48 @2x |
| icon-history | Profile / 浏览历史 | `clock` | `#D8EAF8 → #A8CCF0`（225°） | `#2E7FC0` | 48×48 @2x |
| icon-settings | Profile / 设置 | `settings` | `#F8E8D8 → #F0C8A8`（225°） | `#C67A52` | 48×48 @2x |
| icon-find | Home / 我要找房 | `search` | `#F8EDD8 → #F0C0A0`（225°） | `#C67A52` | 48×48 @2x |
| icon-share | Home / 我要分享 | `send` | `#F8EDD8 → #F0C0A0`（225°） | `#C67A52` | 48×48 @2x |
| icon-lock | 登录弹窗 / 匿名提示 | `lock` | `#F8E8D8 → #F0C8A8`（225°） | `#C67A52` | 48×48 @2x |

底框规格：`width: 48, height: 48, cornerRadius: 14`，icon_font `width: 22, height: 22`。

### 组 2 — Tab 栏图标

每个 Tab 导出两张 PNG：active（白色）和 inactive（`#9A9A9A`）。

| 图标名 | Lucide 符号 | Active 颜色 | Inactive 颜色 | 尺寸 |
|--------|------------|------------|--------------|------|
| home / home-active | `house` | `#FFFFFF` | `#9A9A9A` | 18×18 @2x |
| find / find-active | `search` | `#FFFFFF` | `#9A9A9A` | 18×18 @2x |
| profile / profile-active | `user` | `#FFFFFF` | `#9A9A9A` | 18×18 @2x |

（Pencil 中另有 Chat tab 的 `message-circle` 图标，仅更新设计稿，不导出为代码资产）

### 组 3 — 表单 & 搜索图标

用于发布页表单行。无底框，透明背景 PNG，品牌橙色。

| 图标名 | 位置 | Lucide 符号 | 颜色 | 尺寸 |
|--------|------|------------|------|------|
| icon-price | 月租价格行 | `dollar-sign` | `#C17F4A` | 18×18 @2x |
| icon-location | 所在位置行 | `map-pin` | `#C17F4A` | 18×18 @2x |
| icon-house | 租住类型行 | `house` | `#C17F4A` | 18×18 @2x |
| icon-area | 房屋面积行 | `square` | `#C17F4A` | 18×18 @2x |
| icon-wechat | 微信号行 | `message-square` | `#C17F4A` | 18×18 @2x |
| icon-add | 添加照片按钮 | `plus` | `#C17F4A` | 28×28 @2x |

### 组 4 — 通用 UI 图标

导航、交互控件类图标，无底框，透明背景 PNG。

| 图标名 | 位置 | Lucide 符号 | 颜色 | 尺寸 |
|--------|------|------------|------|------|
| icon-back | Share / Rental Detail 导航栏返回 | `chevron-left` | `#3A2E1E` | 22×22 @2x |
| icon-chevron-right | 动作卡 / 菜单项 / 表单行右箭头 | `chevron-right` | `#C5BAB0` | 16×16 @2x |
| icon-chevron-down | 找房页排序下拉 | `chevron-down` | `#3A2E1E` | 16×16 @2x |
| icon-filter | 找房页筛选按钮 | `sliders-horizontal`（竖向三条滑块样式） | `#FFFFFF` | 18×18 @2x |
| icon-search | 找房页搜索框内 | `search` | `#9A9A9A` | 16×16 @2x |
| icon-lock-sm | 匿名/隐私小提示 | `lock` | `#8B7355` | 16×16 @2x |
| icon-close | 照片删除按钮 | `x` | `#FFFFFF` | 14×14 @2x |
| icon-heart | Rental Detail 收藏按钮 | `heart` | `#C17F4A` | 22×22 @2x |

---

## Pencil 更新策略

对 `pencil-new.pen` 中所有 `icon_font` 节点进行以下操作：

1. **组 1 功能图标**（Profile 菜单、Home 动作卡）：
   - Profile 菜单已有渐变底框（m1icon/m2icon/m3icon），将内部 emoji 文字节点替换为对应 icon_font 节点
   - Home 动作卡内 emoji 文字节点同样替换为 icon_font 节点，底框样式对齐 Style A
   - 登录弹窗（仅 Pencil 设计展示用，不用于实际导出）同样更新

2. **组 2 Tab 栏图标**：Pencil 中已有 icon_font 节点，核对 symbol / 颜色 / 尺寸，确保与规格一致

3. **组 3 & 4**：Pencil 中已有 icon_font 节点，核对颜色与尺寸，将不符合规格的节点更新

4. **状态栏图标**（signal / wifi / battery）：仅设计稿装饰用，不导出，保持 icon_font 不变

---

## 代码更新策略

### 文件结构

```
apps/frontend/src/assets/icons/
├── tab/
│   ├── home.png           # 18×18 @2x, inactive
│   ├── home-active.png    # 18×18 @2x, active
│   ├── find.png
│   ├── find-active.png
│   ├── profile.png
│   └── profile-active.png
├── home/                  # Home 页专属
│   ├── icon-find.png      # 48×48 @2x
│   └── icon-share.png
├── profile/               # Profile 页专属
│   ├── icon-publish.png   # 48×48 @2x
│   ├── icon-favorite.png
│   ├── icon-history.png
│   └── icon-settings.png
├── find/                  # Find 页专属（覆盖现有文件）
│   ├── icon-search.png
│   ├── icon-filter-btn.png
│   └── icon-chevron-down.png
├── share/                 # Share 页专属（覆盖现有文件）
│   ├── icon-price.png
│   ├── icon-location.png
│   ├── icon-house.png
│   ├── icon-area.png
│   ├── icon-wechat.png
│   └── icon-add.png
└── common/                # 跨页公共图标（新建目录）
    ├── icon-back.png
    ├── icon-chevron-right.png
    ├── icon-lock.png
    ├── icon-lock-sm.png
    ├── icon-close.png
    └── icon-heart.png
```

### 代码改动点

| 文件 | 当前 | 改为 |
|------|------|------|
| `pages/profile/index.tsx` | ProfileMenuItem 传 emoji 字符 | 传 PNG `import` |
| `pages/profile/components/ProfileMenuItem/index.tsx` | 渲染 emoji 文字 | 渲染 `<Image>` |
| `pages/home/index.tsx` | ActionCard 传 emoji | 传 PNG `import` |
| `pages/home/components/ActionCard/index.tsx` | 渲染 emoji | 渲染 `<Image>` |
| `pages/home/components/ActionCard/index.tsx` | `›` 文字箭头 | `<Image src={iconChevronRight}>` |
| `pages/profile/components/ProfileMenuItem/index.tsx` | `›` 文字箭头 | `<Image src={iconChevronRight}>` |
| `pages/share/components/FormRow/index.tsx` | `›` 文字箭头 | `<Image src={iconChevronRight}>` |
| `pages/share/components/PhotoUploader/index.tsx` | `×` 文字关闭 | `<Image src={iconClose}>` |
| `shared/ui/login-modal/index.tsx` | `🔒` emoji | `<Image src={iconLock}>` |
| `pages/share/index.tsx` | `🔒` emoji 提示 | `<Image src={iconLockSm}>` |
| `pages/rental-detail/index.tsx` | `♡` 文字收藏 | `<Image src={iconHeart}>` |
| `pages/share/index.tsx` 导航栏 | icon_font chevron-left | `<Image src={iconBack}>` |
| `pages/rental-detail/index.tsx` 导航栏 | icon_font chevron-left | `<Image src={iconBack}>` |
| `find/components/SearchBar` | 已有 PNG，替换新文件 | 路径不变，文件覆盖 |
| `find/components/SortBar` | 已有 PNG，替换 | 路径不变，文件覆盖 |
| `pages/share/index.tsx` 表单图标 | 已有 PNG，替换 | 路径不变，文件覆盖 |
| `custom-tab-bar/index.tsx` | 已有 PNG，替换 | 路径不变，文件覆盖 |

### 图标渲染规范

```tsx
// 固定 width/height（设计稿尺寸，非切图物理尺寸）
<Image src={iconPublish} className="menu-item__icon" mode="aspectFit" />
```

```scss
// 对应 SCSS（48px 设计稿尺寸）
.menu-item__icon {
  width: 48px;
  height: 48px;
}
// 通用 UI 图标（16-22px）
.icon-back { width: 22px; height: 22px; }
.icon-arrow { width: 16px; height: 16px; }
```

---

## 不在本次范围内

- 发布页 Submit 按钮内的 send 图标（目前仅在 Pencil 中，代码里直接用文字"发布分享"）
- 状态栏装饰图标（signal / wifi / battery）
- Chat 页相关图标（页面未实现）
- 新增图标风格动效或状态切换动画

---

**最后更新**: 2026-04-09
