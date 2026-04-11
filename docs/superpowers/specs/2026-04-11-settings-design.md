# 设置功能设计文档

**日期**: 2026-04-11
**状态**: 已审批

## 概述

为小程序 profile 页的"设置"入口实现完整功能，包含：编辑个人资料（头像 + 6 个文本字段）和退出登录。这是小程序功能闭环的最后一块拼图。

---

## 架构

### 新增内容

| 类型 | 路径 |
|------|------|
| 前端页面 | `apps/frontend/src/pages/settings/` |
| 后端路由 | `GET /api/user/profile` |
| 后端路由 | `PUT /api/user/profile` |

### 修改内容

| 文件 | 改动 |
|------|------|
| `apps/backend/src/modules/users/user.repository.ts` | 删除硬编码 `DEMO_ID`，函数签名改为接收 `openid` 参数 |
| `apps/backend/src/modules/users/user.service.ts` | 透传 `openid` 参数 |
| `apps/frontend/src/pages/profile/index.tsx` | "设置"菜单项改为 `navigateTo('/pages/settings/index')`（需登录） |
| `apps/frontend/src/app.config.ts` | 注册 `pages/settings/index` 路由 |

---

## 数据流

```
进入设置页
  → GET /api/user/profile（Bearer token → openid）
  → 填充表单字段

修改头像
  → Taro.chooseImage / Button open-type="chooseAvatar"
  → POST /api/upload
  → 回填头像 URL 到本地状态

点击保存
  → PUT /api/user/profile（body: UserProfileInput）
  → 成功：更新 auth-store.profile → toast "保存成功"
  → 失败：toast "保存失败，请重试"

点击退出登录
  → handleLogout()（清除 token + store）
  → Taro.navigateBack()（回到 profile 页，已呈现未登录状态）
```

---

## 前端页面结构

```
pages/settings/
├── components/
│   ├── SettingsAvatar/       # 头像展示 + chooseAvatar 触发
│   │   ├── index.tsx
│   │   └── index.scss
│   └── SettingsForm/         # 分组表单
│       ├── index.tsx
│       └── index.scss
├── index.tsx                 # 状态管理、数据拉取、提交/退出逻辑
├── index.config.ts
└── index.scss
```

### 页面布局（从上到下）

1. **SettingsAvatar** — 居中头像图片 + "更换头像"文字，Button open-type="chooseAvatar" 覆盖触发
2. **基本信息组**（section 标题 + 输入行）
   - 昵称（文本输入）
3. **租房偏好组**（section 标题 + 输入行）
   - 城市、预算、偏好区域、入住日期、室友期望
4. **保存按钮**
5. **退出登录**（红色文字按钮，保存按钮下方）

### 组件说明

- **`SettingsAvatar`**：接收 `avatarUrl: string` 和 `onChange: (url: string) => void`。内部处理 chooseAvatar → upload → 回调新 URL。
- **`SettingsForm`**：接收 `values: UserProfileInput` 和 `onChange`，渲染两个分组，每行复用与 share 页相同的 FormRow 视觉模式（label + Input），不提取为公共组件。
- **`index.tsx`**：`useLoad` 时调用 `GET /api/user/profile`，维护本地 form state；提交时调用 `PUT`；退出调用 `handleLogout` + `navigateBack`。

---

## 后端接口

### GET /api/user/profile

- 鉴权：Bearer token（JWT → openid）
- 响应：`ApiResponse<UserProfile>`
- 用户不存在时返回字段全为空字符串的默认 profile（不报错）

### PUT /api/user/profile

- 鉴权：Bearer token（JWT → openid）
- Body：`UserProfileInput`（nickname, city, budget, preferredDistrict, moveInDate, roommateExpectation, avatarUrl?）
- 响应：`ApiResponse<UserProfile>`
- 使用 `INSERT ... ON DUPLICATE KEY UPDATE` upsert

### repository 修正

```ts
// 修改前
export async function getUserProfile(): Promise<UserProfile>
export async function saveUserProfile(input: UserProfileInput): Promise<UserProfile>

// 修改后
export async function getUserProfile(openid: string): Promise<UserProfile>
export async function saveUserProfile(openid: string, input: UserProfileInput): Promise<UserProfile>
```

删除 `DEMO_ID`、`fallbackProfile` 常量及 try/catch fallback 逻辑。

`packages/shared/src/contracts/user.ts` 中 `UserProfileInput` 新增可选字段 `avatarUrl?: string`，用于在保存资料时一并更新头像 URL（头像已通过 `/api/upload` 上传，此处只传 URL 字符串）。

---

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 未登录进入设置页 | profile 页已拦截（需登录才 navigateTo） |
| GET profile 失败 | toast 提示，表单显示空白 |
| 头像上传失败 | toast "头像上传失败"，保留原头像，不阻塞其他字段保存 |
| PUT profile 失败 | toast "保存失败，请重试" |
| 退出登录 | 纯本地操作，不会失败 |

---

## 不在范围内

- 隐私设置、关于/版本信息
- 手机号绑定、实名认证
- 账号注销
