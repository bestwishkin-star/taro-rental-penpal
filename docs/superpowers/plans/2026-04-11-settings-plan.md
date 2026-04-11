# 设置功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现设置页面，支持编辑个人资料（头像 + 6 个文本字段）和退出登录，闭环整个小程序。

**Architecture:** 后端新增 `GET/PUT /api/user/profile` 路由，修正 `user.repository.ts` 的硬编码 `DEMO_ID` 为真实 openid；前端新建 `pages/settings/` 页面，由 `SettingsAvatar`（头像选取+上传）和 `SettingsForm`（分组表单）两个组件组成。

**Tech Stack:** Taro v4 + React + TypeScript（前端）、Next.js 15 App Router + MySQL（后端）、Zustand（状态管理）

---

## 文件地图

### 新建
| 文件 | 职责 |
|------|------|
| `apps/backend/src/app/api/user/profile/route.ts` | GET/PUT /api/user/profile 路由处理 |
| `apps/frontend/src/pages/settings/index.tsx` | 设置页入口：状态、数据拉取、提交、退出 |
| `apps/frontend/src/pages/settings/index.config.ts` | 页面导航栏配置 |
| `apps/frontend/src/pages/settings/index.scss` | 页面级样式 |
| `apps/frontend/src/pages/settings/components/SettingsAvatar/index.tsx` | 头像展示+选取+上传 |
| `apps/frontend/src/pages/settings/components/SettingsAvatar/index.scss` | 头像组件样式 |
| `apps/frontend/src/pages/settings/components/SettingsForm/index.tsx` | 分组表单（基本信息+租房偏好） |
| `apps/frontend/src/pages/settings/components/SettingsForm/index.scss` | 表单样式 |

### 修改
| 文件 | 改动 |
|------|------|
| `packages/shared/src/contracts/user.ts` | `UserProfileInput` 新增 `avatarUrl?: string` |
| `apps/backend/src/modules/users/user.repository.ts` | 删除 DEMO_ID，函数接收 openid 参数 |
| `apps/backend/src/modules/users/user.service.ts` | 透传 openid 参数 |
| `apps/frontend/src/shared/api/http.ts` | method 类型新增 `'PUT'` |
| `apps/frontend/src/shared/api/services.ts` | `saveUserProfile` 改为 PUT，新增 `updateUserProfile` 别名 |
| `apps/frontend/src/app.config.ts` | 注册 `pages/settings/index` |
| `apps/frontend/src/pages/profile/index.tsx` | 设置入口改为 navigateTo，需登录才跳转 |

---

## Task 1: 扩展 UserProfileInput 类型

**Files:**
- Modify: `packages/shared/src/contracts/user.ts`

- [ ] **Step 1: 修改 UserProfileInput，新增 avatarUrl 可选字段**

```ts
// packages/shared/src/contracts/user.ts
export interface UserProfile {
  avatarUrl: string;
  budget: string;
  city: string;
  id: string;
  moveInDate: string;
  nickname: string;
  preferredDistrict: string;
  roommateExpectation: string;
  verified: boolean;
}

export interface UserProfileInput {
  avatarUrl?: string;
  budget: string;
  city: string;
  moveInDate: string;
  nickname: string;
  preferredDistrict: string;
  roommateExpectation: string;
}
```

- [ ] **Step 2: 验证类型检查通过**

```bash
pnpm typecheck
```

Expected: 无 TypeScript 错误

- [ ] **Step 3: 提交**

```bash
git add packages/shared/src/contracts/user.ts
git commit -m "feat(shared): UserProfileInput 新增 avatarUrl 可选字段"
```

---

## Task 2: 修正 user.repository.ts（删除 DEMO_ID）

**Files:**
- Modify: `apps/backend/src/modules/users/user.repository.ts`

- [ ] **Step 1: 重写 user.repository.ts**

完整替换文件内容：

```ts
// apps/backend/src/modules/users/user.repository.ts
import type { RowDataPacket } from 'mysql2/promise';

import type { UserProfile, UserProfileInput } from '@shared/contracts/user';

import { pool } from '@/lib/mysql';

interface UserRow extends RowDataPacket {
  openid: string;
  nickname: string;
  avatar_url: string;
  budget: string;
  city: string;
  preferred_district: string;
  move_in_date: string;
  roommate_expectation: string;
  verified: number;
}

function rowToProfile(row: UserRow): UserProfile {
  return {
    id: row.openid,
    avatarUrl: row.avatar_url,
    nickname: row.nickname,
    city: row.city ?? '',
    budget: row.budget ?? '',
    preferredDistrict: row.preferred_district ?? '',
    moveInDate: row.move_in_date ?? '',
    roommateExpectation: row.roommate_expectation ?? '',
    verified: row.verified === 1
  };
}

const emptyProfile = (openid: string): UserProfile => ({
  id: openid,
  avatarUrl: '',
  nickname: '',
  city: '',
  budget: '',
  preferredDistrict: '',
  moveInDate: '',
  roommateExpectation: '',
  verified: false
});

export async function getUserProfile(openid: string): Promise<UserProfile> {
  const [rows] = await pool.execute<UserRow[]>(
    'SELECT * FROM users WHERE openid = ? LIMIT 1',
    [openid]
  );
  return rows[0] ? rowToProfile(rows[0]) : emptyProfile(openid);
}

export async function saveUserProfile(
  openid: string,
  input: UserProfileInput
): Promise<UserProfile> {
  await pool.execute(
    `INSERT INTO users (openid, nickname, avatar_url, city, budget, preferred_district, move_in_date, roommate_expectation, verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       nickname = VALUES(nickname),
       avatar_url = VALUES(avatar_url),
       city = VALUES(city),
       budget = VALUES(budget),
       preferred_district = VALUES(preferred_district),
       move_in_date = VALUES(move_in_date),
       roommate_expectation = VALUES(roommate_expectation),
       updated_at = NOW()`,
    [
      openid,
      input.nickname,
      input.avatarUrl ?? '',
      input.city,
      input.budget,
      input.preferredDistrict,
      input.moveInDate,
      input.roommateExpectation
    ]
  );
  return {
    id: openid,
    avatarUrl: input.avatarUrl ?? '',
    nickname: input.nickname,
    city: input.city,
    budget: input.budget,
    preferredDistrict: input.preferredDistrict,
    moveInDate: input.moveInDate,
    roommateExpectation: input.roommateExpectation,
    verified: false
  };
}
```

- [ ] **Step 2: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/modules/users/user.repository.ts
git commit -m "fix(backend): user.repository 删除硬编码 DEMO_ID，接收真实 openid 参数"
```

---

## Task 3: 更新 user.service.ts 透传 openid

**Files:**
- Modify: `apps/backend/src/modules/users/user.service.ts`

- [ ] **Step 1: 修改 user.service.ts**

```ts
// apps/backend/src/modules/users/user.service.ts
import type { UserProfileInput } from '@shared/contracts/user';

import { getUserProfile, saveUserProfile } from './user.repository';

export async function readUserProfile(openid: string) {
  return getUserProfile(openid);
}

export async function updateUserProfile(openid: string, input: UserProfileInput) {
  return saveUserProfile(openid, input);
}
```

- [ ] **Step 2: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/backend/src/modules/users/user.service.ts
git commit -m "fix(backend): user.service 透传 openid 参数"
```

---

## Task 4: 新建 GET/PUT /api/user/profile 路由

**Files:**
- Create: `apps/backend/src/app/api/user/profile/route.ts`

- [ ] **Step 1: 创建 profile 路由文件**

```ts
// apps/backend/src/app/api/user/profile/route.ts
import type { UserProfileInput } from '@shared/contracts/user';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readUserProfile, updateUserProfile } from '@/modules/users/user.service';

export async function GET(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const profile = await readUserProfile(payload.openid);
    return ok(profile);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as UserProfileInput;
    const profile = await updateUserProfile(payload.openid, body);
    return ok(profile);
  } catch (error) {
    return handleError(error);
  }
}
```

- [ ] **Step 2: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 3: 手动测试 GET（需后端运行中）**

```bash
# 替换 <TOKEN> 为有效 JWT
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/user/profile
```

Expected: `{"code":0,"data":{"id":"...","nickname":"...",...}}`

- [ ] **Step 4: 手动测试 PUT**

```bash
curl -X PUT \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nickname":"测试昵称","city":"上海","budget":"3000","preferredDistrict":"浦东","moveInDate":"2026-05-01","roommateExpectation":"整洁"}' \
  http://localhost:3000/api/user/profile
```

Expected: `{"code":0,"data":{"nickname":"测试昵称",...}}`

- [ ] **Step 5: 提交**

```bash
git add apps/backend/src/app/api/user/profile/route.ts
git commit -m "feat(backend): 新增 GET/PUT /api/user/profile 路由"
```

---

## Task 5: 前端 http.ts 支持 PUT 方法

**Files:**
- Modify: `apps/frontend/src/shared/api/http.ts`

- [ ] **Step 1: 在 RequestOptions 中加入 PUT**

找到 `http.ts` 第 36 行：
```ts
method?: 'GET' | 'POST' | 'PATCH';
```
改为：
```ts
method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
```

同时找到第 79 行 `Taro.request` 的调用，其 `method` 类型由 Taro 定义，`'PUT'` 已受支持，无需额外改动。

- [ ] **Step 2: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/src/shared/api/http.ts
git commit -m "fix(frontend): http.ts method 类型新增 PUT"
```

---

## Task 6: 更新 services.ts 的 saveUserProfile

**Files:**
- Modify: `apps/frontend/src/shared/api/services.ts`

- [ ] **Step 1: 将 saveUserProfile 改为 PUT**

找到 `services.ts` 中：
```ts
export function saveUserProfile(input: UserProfileInput) {
  return httpRequest<UserProfile, UserProfileInput>('/user/profile', {
    method: 'POST',
    body: input
  });
}
```
改为：
```ts
export function saveUserProfile(input: UserProfileInput) {
  return httpRequest<UserProfile, UserProfileInput>('/user/profile', {
    method: 'PUT',
    body: input
  });
}
```

- [ ] **Step 2: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/frontend/src/shared/api/services.ts
git commit -m "fix(frontend): saveUserProfile 改用 PUT 方法"
```

---

## Task 7: SettingsAvatar 组件

**Files:**
- Create: `apps/frontend/src/pages/settings/components/SettingsAvatar/index.tsx`
- Create: `apps/frontend/src/pages/settings/components/SettingsAvatar/index.scss`

- [ ] **Step 1: 创建 SettingsAvatar/index.tsx**

```tsx
// apps/frontend/src/pages/settings/components/SettingsAvatar/index.tsx
import { Button, Image, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

import { uploadPhoto } from '@/shared/api/services';

import './index.scss';

interface Props {
  avatarUrl: string;
  onChange: (url: string) => void;
}

export function SettingsAvatar({ avatarUrl, onChange }: Props) {
  async function handleChooseAvatar(e: { detail: { avatarUrl: string } }) {
    const tempFilePath = e.detail.avatarUrl;
    try {
      const { url } = await uploadPhoto(tempFilePath);
      onChange(url);
    } catch {
      void Taro.showToast({ title: '头像上传失败', icon: 'none', duration: 2000 });
    }
  }

  return (
    <View className="settings-avatar">
      <Button
        className="settings-avatar__btn"
        openType="chooseAvatar"
        onChooseAvatar={handleChooseAvatar as any}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            className="settings-avatar__img"
            mode="aspectFill"
          />
        ) : (
          <View className="settings-avatar__placeholder" />
        )}
      </Button>
      <Text className="settings-avatar__hint">点击更换头像</Text>
    </View>
  );
}
```

- [ ] **Step 2: 创建 SettingsAvatar/index.scss**

```scss
// apps/frontend/src/pages/settings/components/SettingsAvatar/index.scss
.settings-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 0 24px;
  background: #fff;

  &__btn {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    overflow: hidden;

    &::after {
      border: none;
    }
  }

  &__img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
  }

  &__placeholder {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #e8e0d6;
  }

  &__hint {
    margin-top: 10px;
    font-size: 12px;
    color: #8b7761;
  }
}
```

- [ ] **Step 3: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/pages/settings/components/
git commit -m "feat(frontend): 新增 SettingsAvatar 组件"
```

---

## Task 8: SettingsForm 组件

**Files:**
- Create: `apps/frontend/src/pages/settings/components/SettingsForm/index.tsx`
- Create: `apps/frontend/src/pages/settings/components/SettingsForm/index.scss`

- [ ] **Step 1: 创建 SettingsForm/index.tsx**

```tsx
// apps/frontend/src/pages/settings/components/SettingsForm/index.tsx
import { Input, Text, Textarea, View } from '@tarojs/components';

import type { UserProfileInput } from '@shared/contracts/user';

import './index.scss';

interface Props {
  values: UserProfileInput;
  onChange: (key: keyof UserProfileInput, value: string) => void;
}

interface RowProps {
  label: string;
  value: string;
  placeholder?: string;
  onInput: (value: string) => void;
  multiline?: boolean;
}

function SettingsRow({ label, value, placeholder = '请填写', onInput, multiline = false }: RowProps) {
  return (
    <View className="settings-row">
      <Text className="settings-row__label">{label}</Text>
      {multiline ? (
        <Textarea
          className="settings-row__textarea"
          value={value}
          placeholder={placeholder}
          onInput={(e) => onInput(e.detail.value)}
          autoHeight
        />
      ) : (
        <Input
          className="settings-row__input"
          value={value}
          placeholder={placeholder}
          onInput={(e) => onInput(e.detail.value)}
        />
      )}
    </View>
  );
}

export function SettingsForm({ values, onChange }: Props) {
  return (
    <View className="settings-form">
      <View className="settings-form__section">
        <Text className="settings-form__section-title">基本信息</Text>
        <View className="settings-form__group">
          <SettingsRow
            label="昵称"
            value={values.nickname}
            placeholder="请输入昵称"
            onInput={(v) => onChange('nickname', v)}
          />
        </View>
      </View>

      <View className="settings-form__section">
        <Text className="settings-form__section-title">租房偏好</Text>
        <View className="settings-form__group">
          <SettingsRow
            label="城市"
            value={values.city}
            placeholder="如：上海"
            onInput={(v) => onChange('city', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="预算"
            value={values.budget}
            placeholder="如：3000-5000"
            onInput={(v) => onChange('budget', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="偏好区域"
            value={values.preferredDistrict}
            placeholder="如：浦东新区"
            onInput={(v) => onChange('preferredDistrict', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="入住日期"
            value={values.moveInDate}
            placeholder="如：2026-06-01"
            onInput={(v) => onChange('moveInDate', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="室友期望"
            value={values.roommateExpectation}
            placeholder="描述你期望的室友"
            onInput={(v) => onChange('roommateExpectation', v)}
            multiline
          />
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: 创建 SettingsForm/index.scss**

```scss
// apps/frontend/src/pages/settings/components/SettingsForm/index.scss
.settings-form {
  margin-top: 12px;

  &__section {
    margin-bottom: 12px;
  }

  &__section-title {
    display: block;
    padding: 12px 16px 8px;
    font-size: 12px;
    color: #8b7761;
    font-weight: 500;
  }

  &__group {
    background: #fff;
  }

  &__divider {
    height: 1px;
    background: rgba(109, 84, 48, 0.07);
    margin: 0 16px;
  }
}

.settings-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 52px;
  padding: 12px 16px;
  gap: 12px;
  background: #fff;

  &__label {
    width: 64px;
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 600;
    color: #2d241b;
  }

  &__input {
    flex: 1;
    font-size: 14px;
    color: #2d241b;
    text-align: right;
  }

  &__textarea {
    flex: 1;
    font-size: 14px;
    color: #2d241b;
    min-height: 60px;
  }
}
```

- [ ] **Step 3: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/pages/settings/components/SettingsForm/
git commit -m "feat(frontend): 新增 SettingsForm 分组表单组件"
```

---

## Task 9: 设置页入口（index.tsx + config + scss）

**Files:**
- Create: `apps/frontend/src/pages/settings/index.tsx`
- Create: `apps/frontend/src/pages/settings/index.config.ts`
- Create: `apps/frontend/src/pages/settings/index.scss`

- [ ] **Step 1: 创建 index.config.ts**

```ts
// apps/frontend/src/pages/settings/index.config.ts
export default {
  navigationBarTitleText: '设置'
};
```

- [ ] **Step 2: 创建 index.scss**

```scss
// apps/frontend/src/pages/settings/index.scss
.settings-page {
  min-height: 100vh;
  background: #f7f3ec;
  padding-bottom: 40px;
}

.settings-page__actions {
  margin: 24px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-page__save {
  width: 100%;
  height: 48px;
  background: #2d241b;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }

  &--loading {
    opacity: 0.6;
  }
}

.settings-page__logout {
  width: 100%;
  height: 48px;
  background: transparent;
  color: #c0392b;
  font-size: 15px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after {
    border: none;
  }
}
```

- [ ] **Step 3: 创建 index.tsx**

```tsx
// apps/frontend/src/pages/settings/index.tsx
import { Button, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';
import { useState } from 'react';

import type { UserProfileInput } from '@shared/contracts/user';

import { fetchUserProfile, saveUserProfile } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { PageShell } from '@/shared/ui/page-shell';

import { SettingsAvatar } from './components/SettingsAvatar';
import { SettingsForm } from './components/SettingsForm';

import './index.scss';

const defaultForm: UserProfileInput = {
  nickname: '',
  city: '',
  budget: '',
  preferredDistrict: '',
  moveInDate: '',
  roommateExpectation: ''
};

export default function SettingsPage() {
  const { setProfile, handleLogout } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState<UserProfileInput>(defaultForm);
  const [saving, setSaving] = useState(false);

  useLoad(() => {
    fetchUserProfile()
      .then((profile) => {
        setAvatarUrl(profile.avatarUrl);
        setForm({
          nickname: profile.nickname,
          city: profile.city,
          budget: profile.budget,
          preferredDistrict: profile.preferredDistrict,
          moveInDate: profile.moveInDate,
          roommateExpectation: profile.roommateExpectation
        });
      })
      .catch(() => {
        void Taro.showToast({ title: '加载失败', icon: 'none', duration: 2000 });
      });
  });

  function handleChange(key: keyof UserProfileInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await saveUserProfile({ ...form, avatarUrl });
      setProfile(updated);
      void Taro.showToast({ title: '保存成功', icon: 'success', duration: 2000 });
    } catch {
      void Taro.showToast({ title: '保存失败，请重试', icon: 'none', duration: 2000 });
    } finally {
      setSaving(false);
    }
  }

  function handleLogoutClick() {
    handleLogout();
    void Taro.navigateBack();
  }

  return (
    <PageShell>
      <View className="settings-page">
        <SettingsAvatar avatarUrl={avatarUrl} onChange={setAvatarUrl} />
        <SettingsForm values={form} onChange={handleChange} />

        <View className="settings-page__actions">
          <Button
            className={`settings-page__save${saving ? ' settings-page__save--loading' : ''}`}
            onClick={handleSave}
          >
            保存
          </Button>
          <Button className="settings-page__logout" onClick={handleLogoutClick}>
            退出登录
          </Button>
        </View>
      </View>
    </PageShell>
  );
}
```

- [ ] **Step 4: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add apps/frontend/src/pages/settings/
git commit -m "feat(frontend): 新增设置页面（头像+个人资料编辑+退出登录）"
```

---

## Task 10: 注册路由 + 更新 profile 入口

**Files:**
- Modify: `apps/frontend/src/app.config.ts`
- Modify: `apps/frontend/src/pages/profile/index.tsx`

- [ ] **Step 1: 在 app.config.ts 注册设置页路由**

找到 `pages` 数组，在 `'pages/rental-list/index'` 后追加：

```ts
pages: [
  'pages/home/index',
  'pages/find/index',
  'pages/profile/index',
  'pages/share/index',
  'pages/rental-detail/index',
  'pages/rental-list/index',
  'pages/settings/index'   // 新增
],
```

- [ ] **Step 2: 更新 profile/index.tsx 的设置入口**

找到 `handleMenuClick` 函数及"设置"菜单项，做以下两处修改：

1. 新增 `navigateToSettings` 函数（放在 `navigateTo` 函数旁边）：

```tsx
function navigateToSettings() {
  if (!isLoggedIn) { setShowLoginModal(true); return; }
  void Taro.navigateTo({ url: '/pages/settings/index' });
}
```

2. 将"设置"菜单项的 `onClick` 从 `handleMenuClick` 改为 `navigateToSettings`：

```tsx
<ProfileMenuItem
  icon={iconSettings}
  label="设置"
  desc="账号与隐私设置"
  onClick={navigateToSettings}
/>
```

- [ ] **Step 3: 验证类型检查**

```bash
pnpm typecheck
```

Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/app.config.ts apps/frontend/src/pages/profile/index.tsx
git commit -m "feat(frontend): 注册设置路由，profile 页设置入口接入真实页面"
```

---

## Task 11: 端到端验证

- [ ] **Step 1: 启动后端**

```bash
pnpm dev:backend
```

- [ ] **Step 2: 启动前端（微信开发者工具中打开）**

```bash
pnpm dev:frontend
```

- [ ] **Step 3: 验证完整流程**

1. 登录小程序
2. 点击底部"我的" → 点击"设置"菜单项 → 应跳转到设置页
3. 设置页加载后应显示当前用户信息（nickname 等）
4. 修改昵称 → 点击保存 → toast 显示"保存成功"
5. 返回"我的"页面 → 用户昵称应已更新
6. 再次进入设置 → 点击"退出登录" → 返回"我的"页面，显示未登录状态
7. 未登录时点击"设置"菜单项 → 应弹出登录弹窗

- [ ] **Step 4: 验证头像更换**

1. 登录后进入设置页
2. 点击头像区域 → 系统弹出选取头像选项
3. 选择头像 → 头像更新为所选图片
4. 点击保存 → 头像 URL 保存成功

- [ ] **Step 5: 最终提交（如有未提交内容）**

```bash
git status
# 确认所有文件已提交
```
