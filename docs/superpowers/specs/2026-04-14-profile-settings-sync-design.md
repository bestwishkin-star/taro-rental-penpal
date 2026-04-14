# Profile / Settings 本地同步闭环设计文档

**日期**: 2026-04-14
**状态**: 已确认，待用户 review

## 目标

为小程序 `profile` 页和 `settings` 页建立一套统一的本地状态闭环，消除当前 `ProfileHeader` 仍显示假数据、设置页保存后返回 `profile` 页不即时刷新的问题。

本次设计覆盖以下结果：

- `ProfileHeader` 展示真实的头像、昵称、发布数、收藏数、浏览数
- `settings` 页保存成功后，直接更新本地 store，返回 `profile` 页立即展示新值
- `profile` 页与 `settings` 页共用同一份用户资料和统计数据，不再各自维护重复 state
- 登出时清空资料和统计，避免脏数据串用户

## 非目标

本次不包含以下内容：

- 新增后端字段或调整 `/api/user/profile` 协议
- 重做 `ProfileHeader` 视觉样式
- 把所有业务页面都改造成自动同步统计数，只为当前已存在的发布、收藏、浏览链路补齐 store 同步能力

## 当前问题

当前代码存在三类断层：

1. `ProfileHeader` 组件仍保留默认假数据语义，头像区域也没有渲染 `avatarUrl`
2. `profile/index.tsx` 只消费旧 store 中的部分资料，没有形成头像、昵称、统计数的统一真实数据来源
3. `settings/index.tsx` 虽然能保存 profile，但页面间同步边界没有被明确建模，导致“设置页改了，profile 页不一定立即一致”

此外，`useAppStore` 仍在遗留使用中，而项目其余新代码已经切向 `useAuthStore`。

## 设计总览

采用“`auth-store` 作为唯一前端真值源”的方案。

- `auth-store` 扩展为同时持有 `profile` 与 `profileStats`
- `profile` 页只读取 store 并展示，不再维护昵称、头像、统计数的重复 state
- `settings` 页初始化与保存都围绕 store 展开
- 统计数仍然来自真实业务数据，但落地到 store 后再统一被 `ProfileHeader` 消费

该方案的核心目标是让页面同步依赖本地状态流转，而不是依赖“返回上一页时重新拉接口”。

## 状态模型

`auth-store` 中新增或明确以下状态：

```ts
type ProfileStats = {
  publishCount: number;
  favoriteCount: number;
  browseCount: number;
};

type AuthState = {
  isLoggedIn: boolean;
  token: string | null;
  profile: UserProfile | null;
  profileStats: ProfileStats;
  setProfile: (profile: UserProfile | null) => void;
  patchProfile: (partial: Partial<UserProfile>) => void;
  setProfileStats: (stats: ProfileStats) => void;
  patchProfileStats: (partial: Partial<ProfileStats>) => void;
  handleLogout: () => void;
};
```

状态职责如下：

- `profile`：头像、昵称、城市、预算、偏好区域、入住时间、室友期待等用户资料
- `profileStats`：发布数、收藏数、浏览数

Action 职责如下：

- `setProfile(profile)`：整包替换用户资料，适用于登录成功、设置页保存成功、设置页首次补拉资料成功
- `patchProfile(partial)`：局部更新资料，适用于字段级回写，避免页面层手动拼接对象
- `setProfileStats(stats)`：整包写入统计数，适用于 `profile` 页首次归集真实数量
- `patchProfileStats(partial)`：业务动作发生时的增量同步，例如收藏切换、浏览历史新增、发布成功

## 页面数据流

### 登录成功

- 登录成功后将后端返回的登录态和基础 `profile` 写入 `auth-store`
- `profileStats` 初始化为 `{ publishCount: 0, favoriteCount: 0, browseCount: 0 }`
- 不保留上一个用户的统计残留值

### 进入 `profile` 页

- 页面直接从 `useAuthStore` 读取 `profile` 与 `profileStats`
- `ProfileHeader` 的昵称、头像、统计数全部来自 store
- 页面可在 `useDidShow` 中拉取一次真实统计数与必要的用户资料，但结果必须写回 store，而不是落在页面局部 state
- 统计数归集建议使用 `Promise.allSettled`，允许单项失败不影响其他项

### 进入 `settings` 页

- 表单默认值来自 `auth-store.profile`
- 若当前 store 中资料缺失或不完整，可在页面首次进入时调用 `fetchUserProfile`
- `fetchUserProfile` 成功后调用 `setProfile(profile)`，再以该值填充表单
- 设置页不额外维持一份“后端真值”副本

### `settings` 页保存成功

- 调用 `saveUserProfile`
- 使用返回的最新资料调用 `setProfile(updatedProfile)`
- 随后返回 `profile` 页
- `profile` 页因为直接读取 store，会立即显示新的头像和昵称，不依赖重新拉取接口

### 统计数同步策略

统计数纳入 store，但来源仍是各自业务链路的真实数据：

- 发布成功、删除发布、发布状态变更后，由触发页面同步更新 `publishCount`
- 收藏新增/取消后，由触发页面同步更新 `favoriteCount`
- 浏览历史写入后，由触发页面同步更新 `browseCount`
- `profile` 页承担兜底归集职责，在进入页面时可重新读取真实数量并调用 `setProfileStats`

这意味着：

- `profileStats` 是统一展示状态
- 各业务页面是统计写入点
- `profile` 页是展示页，同时承担最终校准入口

## 组件与模块边界

### `auth-store`

职责：

- 持有登录态、用户资料、头部统计数
- 提供清晰的读写 action
- 在登出时统一清空用户相关状态

不负责：

- 页面导航
- 直接调用 UI 组件

### `ProfileHeader`

职责：

- 纯展示组件
- 接收 `nickname`、`avatarUrl`、`stats`、`isLoggedIn`、`onClick`

约束：

- 不再承担“业务假数据兜底”职责
- 仅保留安全默认值，避免 props 缺失时渲染报错
- 头像位置有 `avatarUrl` 时渲染 `<Image>`，无值时渲染占位视图

### `profile/index.tsx`

职责：

- 页面编排
- 导航处理
- 在 `useDidShow` 中触发资料/统计归集并写回 store
- 将 store 数据传递给 `ProfileHeader`

不负责：

- 自己维护重复的昵称、头像、统计数 state

### `settings/index.tsx`

职责：

- 展示表单
- 编辑资料
- 保存成功后更新 store
- 退出登录时调用 `handleLogout`

不负责：

- 自己定义一套独立于 store 的持久资料模型

## 错误处理

### `fetchUserProfile` 失败

- 保留 store 中现有 `profile`
- 若当前页为 `settings`，提示 toast，但不清空已有表单值
- 若当前页为 `profile`，继续展示已有资料

### `saveUserProfile` 失败

- 不写入 store
- 留在 `settings` 页
- toast 提示“保存失败，请重试”

### 统计数部分失败

- 使用 `Promise.allSettled`
- 成功项覆盖写入，失败项保留旧值
- 不因为单一接口失败把三项统计全部归零

### 登出

- 清空 `profile`
- 重置 `profileStats` 为全 0
- 清空 token 与登录态
- 返回到未登录展示

## 目标文件范围

预计涉及以下文件：

| 文件 | 变更 |
|------|------|
| `apps/frontend/src/shared/store/auth-store.ts` | 扩展 `profileStats` 与相关 actions，完善登出清理 |
| `apps/frontend/src/shared/store/app-store.tsx` | 保留兼容层或减少新用法，避免继续扩散 |
| `apps/frontend/src/pages/profile/index.tsx` | 切换为直接消费 `useAuthStore`，统一读写 `profile` / `profileStats` |
| `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx` | 新增 `avatarUrl` prop，改为纯展示真实数据 |
| `apps/frontend/src/pages/settings/index.tsx` | 初始化来自 store，保存成功后写回 store |
| 相关触发统计变化的页面 | 按需要调用 `patchProfileStats` 同步增量 |

## 测试策略

本次测试聚焦同步闭环，不扩展到无关模块。

### Store 层

- `setProfile` 能正确替换资料
- `patchProfile` 能正确局部更新
- `setProfileStats` / `patchProfileStats` 能正确更新统计
- `handleLogout` 能清空 `profile` 并重置 `profileStats`

### `profile` 页

- 从 store 渲染真实头像、昵称、统计数
- `useDidShow` 归集成功后，头部展示对应数量
- 单项统计拉取失败时，其余统计仍正常显示

### `settings` 页

- 表单初始值来自 store
- 保存成功后调用 `setProfile`
- 返回 `profile` 页后，头像与昵称立即更新

### 页面联动回归

- 未登录进入 `profile` 页保持未登录态展示
- 登录后首次进入 `profile` 页能看到真实资料
- 退出登录后重新进入，旧用户资料与统计不会残留

## 取舍说明

本设计明确选择“本地 store 为单一真值源”，而不是“保存后返回上一页再补拉接口”。原因如下：

- 设置页保存后的即时回显更可靠
- 组件职责更清晰，展示组件不需要知道刷新时机
- 页面间状态流转可预测，便于排查问题
- 后续若新增资料字段，只需扩展 store 与表单，不必为每个页面重复补同步逻辑

与之对应，需要接受的约束是：

- 统计变化的触发页面必须承担写回 store 的责任
- `profile` 页仍需要作为最终校准入口，避免某些业务链路遗漏同步时长期漂移

## 实施原则

- 优先复用现有 `useAuthStore`，不再新增第三套 store
- 新代码不继续扩散 `useAppStore`
- 组件默认值只做渲染保护，不制造业务假数据
- 页面内局部 state 只保留表单编辑态、弹窗态、loading 态，不重复保存全局资料
