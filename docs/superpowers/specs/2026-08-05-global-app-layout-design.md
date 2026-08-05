# 小程序全局页面 Layout 设计

## Objective

为小程序建立统一的页面布局边界，由一个 `AppLayout` 组件集中维护可视区域、滚动容器、内容宽度、背景和安全区。解决当前全局 `page` 固定高度与页面局部滚动规则互相覆盖，造成页面无法滚动、内容被底部安全区遮挡或底部留白过多的问题。

本次只统一布局基础设施，不改变页面业务流程和视觉内容。成功标准是每个页面入口都显式使用 `AppLayout`，页面样式不再自行维护 `100vh`、页面级 `overflow` 或安全区补偿。

## Confirmed Decisions

1. 普通详情页和表单页使用小程序原生页面滚动。
2. 需要下拉刷新或触底加载的列表页继续使用 `ScrollView`。
3. 3D 房屋等固定交互页允许关闭页面滚动，并由局部交互区控制手势拦截。
4. 默认滚动模式为 `native`，降低普通页面接入成本。
5. Layout 只负责页面框架，不负责导航栏、业务标题、请求状态或业务组件。
6. 用户负责真机测试与体验，本轮不由开发代理运行自动化测试或构建。

## Approaches Considered

### 方案一：显式 `AppLayout` 页面根组件（采用）

每个页面入口将 `AppLayout` 作为根组件，并根据业务选择 `native`、`list` 或 `static` 模式。布局规则集中维护，页面差异通过少量语义化参数表达。

优点：页面滚动策略清晰，兼容分包、自定义 TabBar 和 Taro 页面生命周期；单个页面出现问题时容易定位。代价是每个页面入口需要显式接入。

### 方案二：在 `app.tsx` 自动包裹全部页面

应用根组件根据当前路由查表决定滚动模式。形式上最集中，但需要在应用层感知路由切换、分包页面和 TabBar 状态，特殊页面还要建立额外注册表。Taro 页面生命周期与根组件更新时机也会增加隐式行为，因此不采用。

### 方案三：只用全局 CSS 统一视口

不新增组件，通过 `page` 和公共 class 约束页面。实现量小，但无法表达列表下拉刷新、固定交互区和安全区差异，仍会让页面自行拼装滚动容器，因此不采用。

## Component Contract

`AppLayout` 放置在 `apps/frontend/src/shared/ui/app-layout/`，作为跨页面公共 UI 组件。

```ts
export type AppLayoutMode = 'native' | 'list' | 'static';

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
```

### `native`

- Layout 根节点和内容节点使用自然高度与 `min-height`。
- 页面由小程序原生滚动，不渲染 `ScrollView`。
- 适用于详情、设置、点位补充和普通内容页面。

### `list`

- Layout 占满当前可视区域，内部 `ScrollView` 占满剩余空间。
- 透传下拉刷新、触底加载和阈值参数。
- 适用于首页、发现页及需要分页能力的列表页面。

### `static`

- Layout 固定在可视区域内，隐藏页面级溢出。
- 业务组件必须自行安排内部区域，不允许内容自然溢出到屏幕外。
- 适用于固定工具界面；3D 房屋主页面如仍需要页面上下浏览，应使用 `native`，只在模型画布触摸期间拦截滚动手势。

## Viewport And Safe Area

1. 全局 `page` 只保留字体、颜色、背景和盒模型规则，不再默认设置 `height: 100%` 与 `overflow: hidden`。
2. `AppLayout` 统一定义 `min-height: 100vh`；`list` 和 `static` 模式定义稳定的 `height: 100vh`。
3. 内容区默认应用底部安全区：`env(safe-area-inset-bottom)`，并保留 `constant(...)` 兼容写法。
4. `withTabBar` 只为使用自定义 TabBar 的一级页面增加 TabBar 占位，不把该留白施加到详情页和分包页。
5. `safeAreaBottom={false}` 仅用于业务自身已经处理安全区的全屏页面，默认值为 `true`。
6. 页面通过 `--app-layout-content-bottom` 调整业务底部留白；安全区和 TabBar 占位始终由 Layout 计算，页面不得直接拼接 `safe-area-inset-bottom`。

## Page Migration Matrix

| 页面 | Layout 模式 | TabBar 占位 | 说明 |
| --- | --- | --- | --- |
| 首页 `pages/home` | `list` | 是 | 保留页面滚动容器 |
| 发现 `pages/find` | `list` | 是 | 保留下拉刷新和触底加载 |
| 我的 `pages/profile` | `list` | 是 | 菜单较长时可滚动 |
| 屋檐记列表 `pages/rental-list` | `list` | 否 | 保留列表滚动行为 |
| 屋檐记详情 `pages/rental-detail` | `native` | 否 | 长正文使用原生滚动 |
| 设置 `pages/settings` | `native` | 否 | 表单内容自然滚动 |
| 3D 房屋 `pages/share` | `native` | 否 | 页面可滚动，模型区域单独处理手势 |
| 点位补充 `pages/share/point` | `native` | 否 | 多步骤内容自然滚动并适配安全区 |

迁移时以页面实际数据加载能力为准。如果某个页面没有下拉刷新或触底加载需求，可从 `list` 收敛为 `native`，但不得自行创建另一套页面滚动规则。

## Compatibility And Migration

1. 先新增 `AppLayout`，保持现有 `PageShell` 可用。
2. 为 `PageShell` 提供兼容实现或兼容导出，将旧的 `container/native/static` 参数映射到新模式，避免未迁移页面立即失效。
3. 按页面逐个迁移到 `AppLayout`，每次移除该页面重复的视口、安全区和滚动 CSS。
4. 所有页面迁移后，删除 `PageShell` 的旧参数和不再使用的样式。
5. 不通过路由名称自动猜测模式，页面入口必须显式声明特殊模式和 `withTabBar`。

## Gesture Boundary

Layout 不全局监听触摸事件。3D 房屋模型继续由模型交互组件在触摸开始时锁定模型区域手势，在触摸结束或取消时释放。这样用户操作模型时页面不会滚动，手指离开模型后页面仍能正常上下浏览。

该职责不能放入 Layout，因为 Layout 不应知道页面内部哪一块是 Three.js 画布。

## Error And Edge Handling

- 安全区环境变量不可用时按 `0px` 处理，基础内容间距仍然存在。
- `list` 模式没有传入刷新回调时不启用下拉刷新。
- `static` 模式的内容溢出属于页面布局错误，不自动降级成滚动，避免固定交互页面意外滑动。
- 页面加载态、错误态和空态必须放在 Layout 内容区内，继承相同的可视区域约束。
- 输入框聚焦导致键盘抬起时，表单页依赖原生滚动和微信键盘避让，不使用固定高度 `ScrollView` 包裹。

## Acceptance Criteria

1. `app.config.ts` 中注册的每个页面都以 `AppLayout` 作为页面根布局。
2. 普通页面内容超过一屏时可以上下滚动，底部操作区域不被系统安全区遮挡。
3. TabBar 页面底部内容不被自定义 TabBar 遮挡，非 TabBar 页面不存在额外的大块留白。
4. 发现页等列表页面保留下拉刷新和触底加载能力。
5. 3D 房屋页面可以滚动；在模型区域旋转或缩放时不带动页面滚动。
6. 点位补充页四个步骤均可滚动至最后一个操作按钮。
7. 页面样式中不再出现用于控制整页的重复 `height: 100vh`、`overflow: hidden/visible` 和安全区补偿。
8. 不改变现有接口请求、页面路由、业务状态和视觉内容。

## Verification Scope

由用户在微信开发者工具和真机中重点验证：普通长页滚动、列表下拉刷新与触底加载、TabBar 遮挡、全面屏底部安全区、键盘弹起后的表单滚动，以及 3D 模型手势与页面滚动的边界。

开发阶段只进行静态代码检查；按用户要求不运行测试、构建或自动化可视化验收。
