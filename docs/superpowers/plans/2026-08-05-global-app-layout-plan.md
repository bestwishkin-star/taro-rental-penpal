# 小程序全局页面 Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立统一的 `AppLayout` 页面根组件，集中维护小程序可视区域、滚动模式、TabBar 占位和底部安全区，并迁移全部已注册页面。

**Architecture:** `AppLayout` 通过 `native/list/static` 三种模式表达页面滚动需求；普通页面使用原生滚动，数据列表使用内部 `ScrollView`，固定交互页锁定视口。页面只维护业务内容间距，整页高度、溢出和安全区由 Layout 统一处理。

**Tech Stack:** Taro 4、React 18、TypeScript、SCSS、Vitest、微信小程序

**Execution Constraint:** 根据用户要求，开发代理不运行测试、构建和真机预览；相关命令仅作为用户验收指引。代码在用户体验通过前不提交，最终按文档、Layout 基础设施、页面迁移分次使用中文 commit。

---

## File Structure

### 新增

- `apps/frontend/src/shared/ui/app-layout/index.tsx`：Layout 组件、公开 Props 和三种渲染模式。
- `apps/frontend/src/shared/ui/app-layout/index.scss`：统一视口、滚动容器、安全区和 TabBar 占位样式。
- `apps/frontend/src/shared/ui/app-layout/class-names.ts`：纯函数生成 Layout class，便于不依赖 Taro 运行时测试。
- `apps/frontend/src/shared/ui/app-layout/class-names.test.ts`：验证模式、安全区和 TabBar 修饰类组合。

### 修改

- `apps/frontend/src/styles/app.scss`：移除全局页面固定高度和溢出裁剪。
- `apps/frontend/src/shared/ui/page-shell.tsx`：迁移期间映射旧参数到 `AppLayout`。
- `apps/frontend/src/shared/ui/page-shell.scss`：删除已被 `AppLayout` 接管的视口样式。
- `apps/frontend/src/pages/home/index.tsx`
- `apps/frontend/src/pages/find/index.tsx`
- `apps/frontend/src/pages/profile/index.tsx`
- `apps/frontend/src/pages/rental-list/index.tsx`
- `apps/frontend/src/pages/rental-detail/index.tsx`
- `apps/frontend/src/pages/settings/index.tsx`
- `apps/frontend/src/pages/share/index.tsx`
- `apps/frontend/src/pages/share/point/index.tsx`
- 对应八个页面的 `index.scss`：移除重复视口、滚动和安全区规则，只保留业务布局。
- `apps/frontend/src/pages/share/point/index.config.ts`：保留 `disableScroll: false`，明确允许原生页面滚动。

---

### Task 1: 为 Layout class 规则建立单元测试

**Files:**
- Create: `apps/frontend/src/shared/ui/app-layout/class-names.test.ts`
- Create: `apps/frontend/src/shared/ui/app-layout/class-names.ts`

- [ ] **Step 1: 编写 class 组合测试**

```ts
import { describe, expect, it } from 'vitest';

import { buildAppLayoutClasses } from './class-names';

describe('buildAppLayoutClasses', () => {
  it('默认生成原生滚动和底部安全区 class', () => {
    expect(buildAppLayoutClasses({ mode: 'native', safeAreaBottom: true })).toEqual({
      root: 'app-layout app-layout--native app-layout--safe-bottom',
      scroll: 'app-layout__scroll app-layout__scroll--native',
      content: 'app-layout__content'
    });
  });

  it('列表页生成 TabBar 占位和自定义内容 class', () => {
    expect(
      buildAppLayoutClasses({
        mode: 'list',
        safeAreaBottom: true,
        withTabBar: true,
        contentClassName: 'find-page'
      })
    ).toEqual({
      root: 'app-layout app-layout--list app-layout--safe-bottom app-layout--with-tab-bar',
      scroll: 'app-layout__scroll app-layout__scroll--list',
      content: 'app-layout__content find-page'
    });
  });

  it('关闭安全区时不生成安全区 class', () => {
    expect(buildAppLayoutClasses({ mode: 'static', safeAreaBottom: false }).root).toBe(
      'app-layout app-layout--static'
    );
  });
});
```

- [ ] **Step 2: 实现最小 class 生成函数**

```ts
/** Layout 支持的页面滚动模式。 */
export type AppLayoutMode = 'native' | 'list' | 'static';

/** 生成 Layout class 时需要的页面布局选项。 */
export interface AppLayoutClassOptions {
  mode: AppLayoutMode;
  safeAreaBottom: boolean;
  withTabBar?: boolean;
  contentClassName?: string;
}

/** 统一生成根节点、滚动节点和内容节点 class。 */
export function buildAppLayoutClasses(options: AppLayoutClassOptions) {
  return {
    root: [
      'app-layout',
      `app-layout--${options.mode}`,
      options.safeAreaBottom ? 'app-layout--safe-bottom' : '',
      options.withTabBar ? 'app-layout--with-tab-bar' : ''
    ].filter(Boolean).join(' '),
    scroll: `app-layout__scroll app-layout__scroll--${options.mode}`,
    content: ['app-layout__content', options.contentClassName].filter(Boolean).join(' ')
  };
}
```

- [ ] **Step 3: 将测试命令记录给用户，不执行**

```bash
pnpm --filter @rental-penpal/frontend test -- src/shared/ui/app-layout/class-names.test.ts
```

预期：3 个测试全部通过。

---

### Task 2: 实现统一 AppLayout 组件与视口样式

**Files:**
- Create: `apps/frontend/src/shared/ui/app-layout/index.tsx`
- Create: `apps/frontend/src/shared/ui/app-layout/index.scss`
- Modify: `apps/frontend/src/styles/app.scss`

- [ ] **Step 1: 实现语义化 Layout 接口**

```tsx
import { ScrollView, View } from '@tarojs/components';
import type { PropsWithChildren } from 'react';

import { buildAppLayoutClasses, type AppLayoutMode } from './class-names';
import './index.scss';

/** 全局页面 Layout 参数。 */
export interface AppLayoutProps extends PropsWithChildren {
  mode?: AppLayoutMode;
  contentClassName?: string;
  withTabBar?: boolean;
  safeAreaBottom?: boolean;
  refresherEnabled?: boolean;
  refresherTriggered?: boolean;
  onRefresherRefresh?: () => void;
  onScrollToLower?: () => void;
  lowerThreshold?: number;
}

/** 统一维护页面视口、滚动容器和安全区。 */
export function AppLayout({
  children,
  mode = 'native',
  contentClassName,
  withTabBar = false,
  safeAreaBottom = true,
  refresherEnabled,
  refresherTriggered,
  onRefresherRefresh,
  onScrollToLower,
  lowerThreshold = 100
}: AppLayoutProps) {
  const classes = buildAppLayoutClasses({ mode, contentClassName, withTabBar, safeAreaBottom });
  const content = <View className={classes.content}>{children}</View>;

  if (mode !== 'list') {
    return (
      <View className={classes.root}>
        <View className={classes.scroll}>{content}</View>
      </View>
    );
  }

  return (
    <View className={classes.root}>
      <ScrollView
        scrollY
        showScrollbar={false}
        className={classes.scroll}
        refresherEnabled={Boolean(refresherEnabled && onRefresherRefresh)}
        refresherTriggered={refresherTriggered}
        onRefresherRefresh={onRefresherRefresh}
        onScrollToLower={onScrollToLower}
        lowerThreshold={lowerThreshold}
      >
        {content}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: 建立唯一的视口和安全区规则**

```scss
.app-layout {
  width: 100%;
  min-height: 100vh;
  color: #2d241b;
  background: #f5efe6;
}

.app-layout--list,
.app-layout--static {
  height: 100vh;
  overflow: hidden;
}

.app-layout__scroll--native {
  min-height: 100vh;
}

.app-layout__scroll--list,
.app-layout__scroll--static {
  height: 100%;
}

.app-layout__scroll--static {
  overflow: hidden;
}

.app-layout__content {
  --app-layout-content-bottom: 24px;
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  min-height: 100%;
  margin: 0 auto;
  padding: 18px 20px var(--app-layout-content-bottom);
}

.app-layout--safe-bottom .app-layout__content {
  padding-bottom: calc(var(--app-layout-content-bottom) + constant(safe-area-inset-bottom));
  padding-bottom: calc(var(--app-layout-content-bottom) + env(safe-area-inset-bottom));
}

.app-layout--with-tab-bar .app-layout__content {
  padding-bottom: calc(92px + constant(safe-area-inset-bottom));
  padding-bottom: calc(92px + env(safe-area-inset-bottom));
}
```

- [ ] **Step 3: 放开全局原生页面滚动**

将 `apps/frontend/src/styles/app.scss` 中 `page` 的 `height: 100%` 和 `overflow: hidden` 删除，只保留全局字体、颜色和背景。`list/static` 的视口锁定由 `AppLayout` 自己负责。

---

### Task 3: 提供 PageShell 迁移兼容层

**Files:**
- Modify: `apps/frontend/src/shared/ui/page-shell.tsx`
- Modify: `apps/frontend/src/shared/ui/page-shell.scss`

- [ ] **Step 1: 将旧参数映射到 AppLayout**

```tsx
import type { PropsWithChildren } from 'react';

import { AppLayout } from './app-layout';

/** 旧页面壳参数，仅用于迁移期间兼容。 */
interface PageShellProps extends PropsWithChildren {
  contentClassName?: string;
  scrollMode?: 'container' | 'native' | 'static';
  refresherEnabled?: boolean;
  refresherTriggered?: boolean;
  onRefresherRefresh?: () => void;
  onScrollToLower?: () => void;
  lowerThreshold?: number;
  scrollEnabled?: boolean;
}

/** 将旧 PageShell 调用映射到统一 AppLayout。 */
export function PageShell({ scrollMode, scrollEnabled = true, ...props }: PageShellProps) {
  const mode = scrollMode === 'native'
    ? 'native'
    : scrollMode === 'static' || !scrollEnabled
      ? 'static'
      : 'list';
  return <AppLayout mode={mode} {...props} />;
}
```

- [ ] **Step 2: 删除旧 PageShell 视口样式**

`page-shell.scss` 中原有 `.page-shell`、`.page-shell__scroll`、`.page-shell__content` 视口和滚动规则全部删除；若该文件后半部分仍有其他公共展示组件样式，则只保留仍被代码引用的部分，不做无关视觉重构。

---

### Task 4: 迁移 TabBar 页面和数据列表页

**Files:**
- Modify: `apps/frontend/src/pages/home/index.tsx`
- Modify: `apps/frontend/src/pages/find/index.tsx`
- Modify: `apps/frontend/src/pages/profile/index.tsx`
- Modify: `apps/frontend/src/pages/rental-list/index.tsx`
- Modify: `apps/frontend/src/pages/find/index.scss`
- Modify: `apps/frontend/src/pages/rental-list/index.scss`

- [ ] **Step 1: 迁移三个 TabBar 页面**

首页、发现和个人中心统一从 `@/shared/ui/app-layout` 导入 `AppLayout`，根节点分别改为：

```tsx
<AppLayout mode="list" withTabBar>...</AppLayout>
```

发现页继续透传：

```tsx
<AppLayout
  mode="list"
  withTabBar
  refresherEnabled
  refresherTriggered={refreshing}
  onRefresherRefresh={handleRefresh}
  onScrollToLower={handleScrollToLower}
>
```

- [ ] **Step 2: 迁移屋檐记列表**

删除页面自行创建的 `ScrollView`，由 Layout 提供唯一滚动容器：

```tsx
<AppLayout mode="list" contentClassName="rental-list-page">
  {/* 原列表内容保持不变 */}
</AppLayout>
```

- [ ] **Step 3: 清理列表页重复样式**

- 删除 `find/index.scss` 对 `.page-shell__content` 的跨组件覆盖，改为页面自己的 `contentClassName` 或使用 Layout 默认间距。
- 删除 `rental-list/index.scss` 的 `height: 100vh`、重复 `box-sizing`、底部 `env(safe-area-inset-bottom)`；保留背景、列表项和业务按钮样式。

---

### Task 5: 迁移详情、设置、3D 房屋和点位补充页

**Files:**
- Modify: `apps/frontend/src/pages/rental-detail/index.tsx`
- Modify: `apps/frontend/src/pages/rental-detail/index.scss`
- Modify: `apps/frontend/src/pages/settings/index.tsx`
- Modify: `apps/frontend/src/pages/settings/index.scss`
- Modify: `apps/frontend/src/pages/share/index.tsx`
- Modify: `apps/frontend/src/pages/share/index.scss`
- Modify: `apps/frontend/src/pages/share/point/index.tsx`
- Modify: `apps/frontend/src/pages/share/point/index.scss`

- [ ] **Step 1: 详情页使用原生滚动**

加载、空状态和正常内容都以 `AppLayout mode="native"` 为根节点。删除详情页内部 `ScrollView`，保留底部收藏/举报操作区，并通过详情内容自身的底部间距避让固定操作区。

```tsx
<AppLayout mode="native" contentClassName="detail-page" safeAreaBottom={false}>
  <View className="detail-hero">...</View>
  <View className="detail-content">...</View>
  <View className="detail-bottom">...</View>
</AppLayout>
```

删除 `.detail-page { min-height: 100vh; }` 和 `.detail-scroll { height: ... }`。`.detail-bottom` 继续负责自身安全区，因此关闭 Layout 的重复底部安全区。

- [ ] **Step 2: 设置页改为原生滚动表单**

删除设置页内部 `ScrollView`，页面根节点改为：

```tsx
<AppLayout mode="native" contentClassName="settings-page-shell" safeAreaBottom={false}>
  <View className="settings-page">
    <View className="settings-page__body">...</View>
    <View className="settings-page__actions">...</View>
  </View>
</AppLayout>
```

操作区继续自行维护安全区，避免 Layout 和操作区叠加两次。删除设置页依赖 `height: 100%`、`min-height: 0` 的固定容器规则。

- [ ] **Step 3: 迁移 3D 房屋页**

将三个返回分支统一改为 `AppLayout mode="native" contentClassName="share-page-shell"`。删除 `share/index.scss` 中页面级 `page { height/overflow }` 覆盖；模型区域现有触摸锁定逻辑保持不变。

- [ ] **Step 4: 迁移点位补充页**

将加载、错误和正常内容三个分支统一改为：

```tsx
<AppLayout mode="native" contentClassName="share-point-page">...</AppLayout>
```

删除 `point/index.scss` 的 `page` 选择器、`.page-shell__content` 耦合、`height` 和 `overflow` 补丁。保留页面内容间距：

```scss
.share-point-page {
  --app-layout-content-bottom: 48px;
  padding-top: 18px;
  padding-right: 16px;
  padding-left: 16px;
  background: #f4f1ec;
}
```

底部安全区由 `AppLayout` 修饰类叠加；页面只保留 48px 业务留白。

---

### Task 6: 完成迁移清理与交付检查

**Files:**
- Modify: `apps/frontend/src/shared/ui/page-shell.tsx`（无引用后删除兼容层）
- Modify: `apps/frontend/src/shared/ui/page-shell.scss`（无引用后删除旧文件）
- Review: `apps/frontend/src/pages/**/*.scss`
- Review: `apps/frontend/src/pages/**/*.tsx`

- [ ] **Step 1: 确认所有注册页面已接入 AppLayout**

执行静态搜索但不运行构建：

```bash
rg -n "<PageShell|<ScrollView[^>]*scrollY|height:\s*(100vh|100%)|overflow:\s*(hidden|visible)|safe-area-inset-bottom" apps/frontend/src/pages
```

逐项判断：业务组件内部的图片裁剪和模型容器 `overflow: hidden` 可以保留；整页视口、滚动和安全区规则必须收口到 `AppLayout`。

- [ ] **Step 2: 删除无引用兼容层**

当 `rg -n "PageShell" apps/frontend/src` 无页面引用后，删除 `page-shell.tsx` 中兼容组件及其专属样式文件。若后半段样式被其他组件使用，则先迁移对应 class，不能直接删除有效样式。

- [ ] **Step 3: 执行仅格式级静态检查**

开发代理只执行：

```bash
git diff --check
```

不执行 `pnpm test`、`pnpm typecheck`、`pnpm build:frontend` 或微信开发者工具预览。

- [ ] **Step 4: 交给用户验收**

用户重点验证：

1. 首页、发现、我的三个 TabBar 页面滚动到底部时不被 TabBar 遮挡。
2. 发现页下拉刷新和触底加载正常。
3. 我的屋檐记、收藏和历史页面可以完整滚动。
4. 屋檐记详情和设置页底部操作区不被全面屏安全区遮挡。
5. 3D 房屋页面能上下滚动，模型旋转和缩放期间页面不跟随滚动。
6. 点位补充四个步骤都能滚动到最后一个按钮，底部没有过量留白。

- [ ] **Step 5: 用户验收通过后按内容分次提交**

```bash
git add docs/superpowers/specs/2026-08-05-global-app-layout-design.md docs/superpowers/plans/2026-08-05-global-app-layout-plan.md
git commit -m "文档：设计小程序全局页面布局"

git add apps/frontend/src/shared/ui/app-layout apps/frontend/src/shared/ui/page-shell.tsx apps/frontend/src/shared/ui/page-shell.scss apps/frontend/src/styles/app.scss
git commit -m "重构：统一页面视口与安全区布局"

git add apps/frontend/src/pages
git commit -m "重构：迁移小程序页面至统一布局"
```

提交前必须按实际变更重新核对暂存区，不能把当前工作树中其他尚未验收的空间记录业务代码混入 Layout 提交。
