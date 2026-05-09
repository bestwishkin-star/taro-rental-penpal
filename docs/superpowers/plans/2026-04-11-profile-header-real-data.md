# ProfileHeader 真实数据接入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 ProfileHeader 展示真实的头像、昵称和发布/收藏/浏览统计数字，替换当前的硬编码占位数据。

**Architecture:** 在 `profile/index.tsx` 的 `useDidShow` 中并行调用三个 API 取计数，结果通过 props 传入纯展示组件 `ProfileHeader`；同时修复 `useAppStore` → `useAuthStore` 的遗留问题并新增 `avatarUrl` prop 渲染真实头像。

**Tech Stack:** Taro v4, React, TypeScript, Zustand (`useAuthStore`)

---

## 文件变更索引

| 文件 | 操作 |
|------|------|
| `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx` | 修改：新增 `avatarUrl` prop，用 `<Image>` 渲染头像 |
| `apps/frontend/src/pages/profile/index.tsx` | 修改：修复 `useAppStore`→`useAuthStore`，`useDidShow` 拉取真实数据 |

---

### Task 1: ProfileHeader — 新增 avatarUrl prop 并渲染真实头像

**Files:**
- Modify: `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx`

**背景：** 当前头像区域是空 `<View>`，`profile.avatarUrl` 从未被渲染。新增可选 prop `avatarUrl`，有值时用 `<Image>` 显示，无值时保留原有占位 View。

- [ ] **Step 1: 替换文件内容**

将 `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx` 替换为：

```tsx
import { Image, Text, View } from '@tarojs/components';

import './index.scss';

interface StatItem {
  value: number | string;
  label: string;
}

interface Props {
  nickname?: string;
  avatarUrl?: string;
  isLoggedIn: boolean;
  stats?: StatItem[];
  onClick?: () => void;
}

const DEFAULT_STATS: StatItem[] = [
  { value: 0, label: '发布' },
  { value: 0, label: '收藏' },
  { value: 0, label: '浏览' }
];

export function ProfileHeader({ nickname, avatarUrl, isLoggedIn, stats = DEFAULT_STATS, onClick }: Props) {
  return (
    <View className="profile-header" hoverClass="profile-header--active" onClick={onClick}>
      <View className="profile-header__top">
        {avatarUrl
          ? <Image src={avatarUrl} className="profile-header__avatar" mode="aspectFill" />
          : <View className="profile-header__avatar" />
        }
        <View className="profile-header__info">
          <Text className="profile-header__name">
            {isLoggedIn ? (nickname ?? '租房用户') : '未登录'}
          </Text>
          <Text className="profile-header__desc">
            {isLoggedIn ? '完善个人信息，提升信任度' : '点击登录查看更多功能'}
          </Text>
        </View>
      </View>
      <View className="profile-header__stats">
        {stats.map((stat) => (
          <View key={stat.label} className="profile-header__stat">
            <Text className="profile-header__stat-value">{stat.value}</Text>
            <Text className="profile-header__stat-label">{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: ESLint 检查**

```bash
npx eslint apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx --fix
```

Expected: 无报错（或自动修复后无报错）

- [ ] **Step 3: TypeScript 检查**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: 无类型错误（此步改动仅新增可选 prop，不会引入类型问题）

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx
git commit -m "feat: ProfileHeader 支持 avatarUrl prop 渲染真实头像"
```

---

### Task 2: profile/index.tsx — 修复 store 导入，useDidShow 拉取真实数据

**Files:**
- Modify: `apps/frontend/src/pages/profile/index.tsx`

**背景：** 当前文件从不存在的 `@/shared/store/app-store` 导入 `useAppStore`（遗留问题），且 stats 始终为 0。本 Task 修复导入，并在 `useDidShow` 中并行拉取发布数、收藏数、浏览数，传给 ProfileHeader。

- [ ] **Step 1: 替换文件内容**

将 `apps/frontend/src/pages/profile/index.tsx` 替换为：

```tsx
import { View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import iconFavorite from '@/assets/icons/profile/icon-favorite.png';
import iconHistory from '@/assets/icons/profile/icon-history.png';
import iconPublish from '@/assets/icons/profile/icon-publish.png';
import iconSettings from '@/assets/icons/profile/icon-settings.png';
import {
  fetchFavorites,
  fetchMyRentals,
  fetchUserProfile,
  getBrowseHistory,
  login
} from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { LoginModal } from '@/shared/ui/login-modal';
import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { ProfileHeader } from './components/ProfileHeader';
import { ProfileMenuItem } from './components/ProfileMenuItem';

import './index.scss';

export default function ProfilePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [publishCount, setPublishCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [browseCount, setBrowseCount] = useState(0);
  const { isLoggedIn, profile, handleLoginSuccess, setProfile } = useAuthStore();

  useDidShow(() => {
    setTabBarSelected(2);
    if (!isLoggedIn) return;

    setBrowseCount(getBrowseHistory().length);

    void Promise.allSettled([
      fetchUserProfile().then((p) => setProfile(p)),
      fetchMyRentals().then((list) => setPublishCount(list.length)),
      fetchFavorites().then((list) => setFavoriteCount(list.length))
    ]);
  });

  function handleHeaderClick() {
    if (!isLoggedIn) setShowLoginModal(true);
  }

  function handleLogin() {
    Taro.login({
      success: (res) => {
        if (!res.code) {
          Taro.showToast({ title: '登录失败', icon: 'none', duration: 2000 });
          return;
        }
        login(res.code)
          .then((data) => {
            handleLoginSuccess(data);
            setShowLoginModal(false);
            Taro.showToast({ title: '登录成功', icon: 'success', duration: 2000 });
          })
          .catch(() => {
            Taro.showToast({ title: '登录失败，请重试', icon: 'none', duration: 2000 });
          });
      },
      fail: () => {
        Taro.showToast({ title: '登录失败', icon: 'none', duration: 2000 });
      }
    });
  }

  function navigateTo(type: 'mine' | 'favorites' | 'history') {
    if (!isLoggedIn && type !== 'history') { setShowLoginModal(true); return; }
    void Taro.navigateTo({ url: `/pages/rental-list/index?type=${type}` });
  }

  function navigateToSettings() {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    void Taro.navigateTo({ url: '/pages/settings/index' });
  }

  return (
    <PageShell>
      <ProfileHeader
        isLoggedIn={isLoggedIn}
        nickname={profile?.nickname}
        avatarUrl={profile?.avatarUrl}
        stats={[
          { value: publishCount, label: '发布' },
          { value: favoriteCount, label: '收藏' },
          { value: browseCount, label: '浏览' }
        ]}
        onClick={handleHeaderClick}
      />

      <View className="profile-menu">
        <ProfileMenuItem
          icon={iconPublish}
          label="我的发布"
          desc="查看我发布的房源"
          onClick={() => navigateTo('mine')}
        />
        <ProfileMenuItem
          icon={iconFavorite}
          label="我的收藏"
          desc="查看收藏的房源"
          onClick={() => navigateTo('favorites')}
        />
        <ProfileMenuItem
          icon={iconHistory}
          label="浏览历史"
          desc="最近看过的房源"
          onClick={() => navigateTo('history')}
        />
        <ProfileMenuItem
          icon={iconSettings}
          label="设置"
          desc="账号与隐私设置"
          onClick={navigateToSettings}
        />
      </View>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </PageShell>
  );
}
```

- [ ] **Step 2: ESLint 检查**

```bash
npx eslint apps/frontend/src/pages/profile/index.tsx --fix
```

Expected: 无报错

- [ ] **Step 3: TypeScript 检查**

```bash
cd apps/frontend && npx tsc --noEmit
```

Expected: 无类型错误。关键验证点：
- `useAuthStore` 导出 `setProfile`（在 `auth-store.ts` 中已定义）
- `fetchFavorites`、`fetchMyRentals`、`fetchUserProfile`、`getBrowseHistory` 均已在 `services.ts` 中导出
- `ProfileHeader` 的 `avatarUrl` prop 在 Task 1 中已添加

- [ ] **Step 4: 提交**

```bash
git add apps/frontend/src/pages/profile/index.tsx
git commit -m "feat: profile 页 useDidShow 加载真实发布/收藏/浏览数，修复 useAppStore 遗留问题"
```
