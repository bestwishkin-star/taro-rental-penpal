# Profile / Settings Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `profile` and `settings` share one local source of truth so avatar, nickname, and header stats update immediately after save and stay consistent after login, browse, favorite, publish, and logout.

**Architecture:** Extend `useAuthStore` to hold both `profile` and `profileStats`, then make `profile` and `settings` read/write that store instead of keeping duplicated page-local data. Keep stats backed by real business data: `profile` page performs final aggregation on `useDidShow`, while `share` and `rental-detail` push immediate local count updates when they mutate publish/favorite/history state.

**Tech Stack:** Taro 4, React 18, Zustand persist, TypeScript, ESLint, pnpm, Vitest for new store-level tests

---

## File Map

| File | Responsibility |
|------|------|
| `apps/frontend/package.json` | Add frontend test command and Vitest dependency |
| `apps/frontend/src/shared/store/auth-store.ts` | Add `profileStats`, patch actions, login/logout reset behavior |
| `apps/frontend/src/shared/store/auth-store.test.ts` | Cover store transitions and reset behavior |
| `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx` | Render `avatarUrl` and externally supplied stats as a pure display component |
| `apps/frontend/src/pages/profile/index.tsx` | Read `profile`/`profileStats` from store and aggregate real counts on `useDidShow` |
| `apps/frontend/src/pages/settings/index.tsx` | Initialize from store, fetch missing profile if needed, save back into store |
| `apps/frontend/src/pages/rental-detail/index.tsx` | Increment browse/favorite stats on successful user actions |
| `apps/frontend/src/pages/share/index.tsx` | Increment publish count after successful create |

## Notes Before Implementation

- No frontend test runner exists today. This plan adds the smallest possible Vitest setup for pure store tests only.
- Do not add a second global store or a page-scoped profile cache.
- Do not expand `useAppStore`; new code should use `useAuthStore` directly.
- Keep component defaults defensive, not business-semantic. The component may render `0`, but the source of truth must be the store.

### Task 1: Add a Minimal Frontend Test Harness and Lock the Store Contract

**Files:**
- Modify: `apps/frontend/package.json`
- Create: `apps/frontend/src/shared/store/auth-store.test.ts`

- [ ] **Step 1: Add a frontend test script and Vitest dev dependency**

Update `apps/frontend/package.json` to add a test command and `vitest`:

```json
{
  "scripts": {
    "dev:weapp": "cross-env NODE_ENV=development taro build --type weapp --watch",
    "build:weapp": "cross-env NODE_ENV=production taro build --type weapp",
    "dev:tt": "cross-env NODE_ENV=development taro build --type tt --watch",
    "build:tt": "cross-env NODE_ENV=production taro build --type tt",
    "dev:jd": "cross-env NODE_ENV=development taro build --type jd --watch",
    "build:jd": "cross-env NODE_ENV=production taro build --type jd",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "devDependencies": {
    "@babel/preset-react": "^7.28.5",
    "@tarojs/cli": "^4.0.9",
    "@tarojs/plugin-framework-react": "^4.0.9",
    "@tarojs/plugin-platform-jd": "^4.0.9",
    "@tarojs/plugin-platform-tt": "^4.0.9",
    "@tarojs/plugin-platform-weapp": "^4.0.9",
    "@tarojs/webpack5-runner": "^4.0.9",
    "@types/node": "^22.13.10",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "babel-preset-taro": "^4.1.11",
    "cross-env": "^7.0.3",
    "sass": "^1.85.1",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Write failing store tests for the new state contract**

Create `apps/frontend/src/shared/store/auth-store.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LoginResponse } from '@shared/contracts/auth';

const storage = new Map<string, string>();

vi.mock('@tarojs/taro', () => ({
  default: {
    getStorageSync: (key: string) => storage.get(key) ?? '',
    setStorageSync: (key: string, value: string) => storage.set(key, value),
    removeStorageSync: (key: string) => storage.delete(key)
  }
}));

import { useAuthStore } from './auth-store';

const loginPayload: LoginResponse = {
  token: 'token-123',
  user: {
    id: 'user-1',
    nickname: 'Milo',
    avatarUrl: 'https://cdn.test/avatar.png'
  }
};

describe('useAuthStore', () => {
  beforeEach(() => {
    storage.clear();
    useAuthStore.setState({
      isLoggedIn: false,
      profile: null,
      profileStats: { publishCount: 0, favoriteCount: 0, browseCount: 0 }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes stats on login success', () => {
    useAuthStore.getState().handleLoginSuccess(loginPayload);

    expect(useAuthStore.getState().profile?.nickname).toBe('Milo');
    expect(useAuthStore.getState().profileStats).toEqual({
      publishCount: 0,
      favoriteCount: 0,
      browseCount: 0
    });
  });

  it('patches profile fields without dropping untouched values', () => {
    useAuthStore.getState().handleLoginSuccess(loginPayload);

    useAuthStore.getState().patchProfile({
      nickname: 'Milo Chen',
      city: 'Shanghai'
    });

    expect(useAuthStore.getState().profile).toMatchObject({
      id: 'user-1',
      nickname: 'Milo Chen',
      city: 'Shanghai',
      avatarUrl: 'https://cdn.test/avatar.png'
    });
  });

  it('patches profile stats incrementally', () => {
    useAuthStore.getState().setProfileStats({
      publishCount: 1,
      favoriteCount: 2,
      browseCount: 3
    });

    useAuthStore.getState().patchProfileStats({ favoriteCount: 5 });

    expect(useAuthStore.getState().profileStats).toEqual({
      publishCount: 1,
      favoriteCount: 5,
      browseCount: 3
    });
  });

  it('clears profile and resets stats on logout', () => {
    useAuthStore.getState().handleLoginSuccess(loginPayload);
    useAuthStore.getState().setProfileStats({
      publishCount: 4,
      favoriteCount: 5,
      browseCount: 6
    });

    useAuthStore.getState().handleLogout();

    expect(useAuthStore.getState().isLoggedIn).toBe(false);
    expect(useAuthStore.getState().profile).toBeNull();
    expect(useAuthStore.getState().profileStats).toEqual({
      publishCount: 0,
      favoriteCount: 0,
      browseCount: 0
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail against the current store**

Run:

```bash
pnpm --filter @rental-penpal/frontend test -- src/shared/store/auth-store.test.ts
```

Expected: FAIL because `profileStats`, `patchProfile`, and `patchProfileStats` do not exist yet.

- [ ] **Step 4: Commit the red test harness baseline**

```bash
git add apps/frontend/package.json apps/frontend/src/shared/store/auth-store.test.ts
git commit -m "test(frontend): add auth store contract tests"
```

### Task 2: Extend `useAuthStore` Into the Single Local Truth Source

**Files:**
- Modify: `apps/frontend/src/shared/store/auth-store.ts`
- Test: `apps/frontend/src/shared/store/auth-store.test.ts`

- [ ] **Step 1: Implement the expanded store shape**

Replace the store interfaces and state setup in `apps/frontend/src/shared/store/auth-store.ts` with:

```ts
interface ProfileStats {
  publishCount: number;
  favoriteCount: number;
  browseCount: number;
}

interface AuthState {
  isLoggedIn: boolean;
  profile: UserProfile | null;
  profileStats: ProfileStats;
}

interface AuthActions {
  setProfile: (profile: UserProfile | null) => void;
  patchProfile: (partial: Partial<UserProfile>) => void;
  setProfileStats: (stats: ProfileStats) => void;
  patchProfileStats: (partial: Partial<ProfileStats>) => void;
  handleLoginSuccess: (data: LoginResponse) => void;
  handleLogout: () => void;
}

type AuthStore = AuthState & AuthActions;

const EMPTY_STATS: ProfileStats = {
  publishCount: 0,
  favoriteCount: 0,
  browseCount: 0
};
```

- [ ] **Step 2: Implement the state transitions**

Update the persisted store implementation to:

```ts
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isLoggedIn: !!getToken(),
      profile: null,
      profileStats: EMPTY_STATS,

      setProfile: (profile) => set({ profile }),

      patchProfile: (partial) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...partial } : state.profile
        })),

      setProfileStats: (profileStats) => set({ profileStats }),

      patchProfileStats: (partial) =>
        set((state) => ({
          profileStats: { ...state.profileStats, ...partial }
        })),

      handleLoginSuccess: (data) => {
        setToken(data.token);
        set({
          isLoggedIn: true,
          profile: {
            id: data.user.id,
            nickname: data.user.nickname,
            avatarUrl: data.user.avatarUrl,
            budget: '',
            city: '',
            moveInDate: '',
            preferredDistrict: '',
            roommateExpectation: '',
            verified: false
          },
          profileStats: EMPTY_STATS
        });
      },

      handleLogout: () => {
        removeToken();
        set({
          isLoggedIn: false,
          profile: null,
          profileStats: EMPTY_STATS
        });
      }
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => taroStorage),
      partialize: (state): Pick<AuthStore, 'profile' | 'profileStats'> => ({
        profile: state.profile,
        profileStats: state.profileStats
      })
    }
  )
);
```

- [ ] **Step 3: Run the tests to verify the store contract now passes**

Run:

```bash
pnpm --filter @rental-penpal/frontend test -- src/shared/store/auth-store.test.ts
```

Expected: PASS with 4 passing tests.

- [ ] **Step 4: Run typecheck for the frontend package**

Run:

```bash
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: FAIL or surface follow-up compile errors in pages that still assume the old store shape.

- [ ] **Step 5: Commit the store change**

```bash
git add apps/frontend/src/shared/store/auth-store.ts apps/frontend/src/shared/store/auth-store.test.ts
git commit -m "feat(frontend): extend auth store with profile stats"
```

### Task 3: Make `ProfileHeader` and `profile` Consume Real Store Data

**Files:**
- Modify: `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx`
- Modify: `apps/frontend/src/pages/profile/index.tsx`

- [ ] **Step 1: Make `ProfileHeader` render avatar and fully external stats**

Update `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx` to:

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
  stats: StatItem[];
  onClick?: () => void;
}

export function ProfileHeader({ nickname, avatarUrl, isLoggedIn, stats, onClick }: Props) {
  return (
    <View className="profile-header" hoverClass="profile-header--active" onClick={onClick}>
      <View className="profile-header__top">
        {avatarUrl ? (
          <Image src={avatarUrl} className="profile-header__avatar" mode="aspectFill" />
        ) : (
          <View className="profile-header__avatar" />
        )}
        <View className="profile-header__info">
          <Text className="profile-header__name">
            {isLoggedIn ? nickname || '未设置昵称' : '立即登录'}
          </Text>
          <Text className="profile-header__desc">
            {isLoggedIn ? '编辑资料，完善你的租房偏好' : '登录后查看我的发布、收藏和浏览历史'}
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

- [ ] **Step 2: Replace page-local placeholder behavior with store-backed aggregation**

Update `apps/frontend/src/pages/profile/index.tsx` to:

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
  const {
    isLoggedIn,
    profile,
    profileStats,
    handleLoginSuccess,
    setProfile,
    setProfileStats
  } = useAuthStore();

  useDidShow(() => {
    setTabBarSelected(2);
    if (!isLoggedIn) return;

    void Promise.allSettled([
      fetchUserProfile(),
      fetchMyRentals(),
      fetchFavorites(),
      Promise.resolve(getBrowseHistory())
    ]).then(([profileResult, mineResult, favoriteResult, historyResult]) => {
      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      }

      setProfileStats({
        publishCount: mineResult.status === 'fulfilled' ? mineResult.value.length : profileStats.publishCount,
        favoriteCount:
          favoriteResult.status === 'fulfilled' ? favoriteResult.value.length : profileStats.favoriteCount,
        browseCount: historyResult.status === 'fulfilled' ? historyResult.value.length : profileStats.browseCount
      });
    });
  });

  function handleHeaderClick() {
    if (!isLoggedIn) setShowLoginModal(true);
  }

  function handleLogin() {
    Taro.login({
      success: (res) => {
        if (!res.code) {
          void Taro.showToast({ title: '登录失败', icon: 'none', duration: 2000 });
          return;
        }

        login(res.code)
          .then((data) => {
            handleLoginSuccess(data);
            setShowLoginModal(false);
            void Taro.showToast({ title: '登录成功', icon: 'success', duration: 2000 });
          })
          .catch(() => {
            void Taro.showToast({ title: '登录失败，请重试', icon: 'none', duration: 2000 });
          });
      },
      fail: () => {
        void Taro.showToast({ title: '登录失败', icon: 'none', duration: 2000 });
      }
    });
  }

  function navigateTo(type: 'mine' | 'favorites' | 'history') {
    if (!isLoggedIn && type !== 'history') {
      setShowLoginModal(true);
      return;
    }

    void Taro.navigateTo({ url: `/pages/rental-list/index?type=${type}` });
  }

  function navigateToSettings() {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    void Taro.navigateTo({ url: '/pages/settings/index' });
  }

  return (
    <PageShell>
      <ProfileHeader
        isLoggedIn={isLoggedIn}
        nickname={profile?.nickname}
        avatarUrl={profile?.avatarUrl}
        stats={[
          { value: profileStats.publishCount, label: '我的发布' },
          { value: profileStats.favoriteCount, label: '我的收藏' },
          { value: profileStats.browseCount, label: '浏览历史' }
        ]}
        onClick={handleHeaderClick}
      />

      <View className="profile-menu">
        <ProfileMenuItem icon={iconPublish} label="我的发布" desc="查看我发布的找室友和房源信息" onClick={() => navigateTo('mine')} />
        <ProfileMenuItem icon={iconFavorite} label="我的收藏" desc="查看我收藏的房源" onClick={() => navigateTo('favorites')} />
        <ProfileMenuItem icon={iconHistory} label="浏览历史" desc="查看我最近浏览过的房源" onClick={() => navigateTo('history')} />
        <ProfileMenuItem icon={iconSettings} label="设置" desc="编辑头像、昵称和租房偏好" onClick={navigateToSettings} />
      </View>

      <LoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} onLogin={handleLogin} />
    </PageShell>
  );
}
```

- [ ] **Step 3: Run typecheck and lint for the two profile files**

Run:

```bash
pnpm --filter @rental-penpal/frontend exec eslint src/pages/profile/index.tsx src/pages/profile/components/ProfileHeader/index.tsx
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS for lint, and typecheck should now move any remaining errors to other planned files.

- [ ] **Step 4: Commit the profile page conversion**

```bash
git add apps/frontend/src/pages/profile/index.tsx apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx
git commit -m "feat(frontend): wire profile header to shared profile store"
```

### Task 4: Make `settings` Read From and Write Back to the Shared Store

**Files:**
- Modify: `apps/frontend/src/pages/settings/index.tsx`

- [ ] **Step 1: Initialize settings from store and fetch only when needed**

Update `apps/frontend/src/pages/settings/index.tsx` to:

```tsx
import { useEffect, useState } from 'react';

import { Button, View } from '@tarojs/components';
import Taro from '@tarojs/taro';

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

function toForm(profile: ReturnType<typeof useAuthStore.getState>['profile']): UserProfileInput {
  if (!profile) return defaultForm;
  return {
    nickname: profile.nickname,
    city: profile.city,
    budget: profile.budget,
    preferredDistrict: profile.preferredDistrict,
    moveInDate: profile.moveInDate,
    roommateExpectation: profile.roommateExpectation
  };
}

export default function SettingsPage() {
  const { profile, setProfile, handleLogout } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [form, setForm] = useState<UserProfileInput>(() => toForm(profile));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAvatarUrl(profile?.avatarUrl || '');
    setForm(toForm(profile));
  }, [profile]);

  useEffect(() => {
    if (profile) return;

    fetchUserProfile()
      .then((nextProfile) => {
        setProfile(nextProfile);
      })
      .catch(() => {
        void Taro.showToast({ title: '资料加载失败', icon: 'none', duration: 2000 });
      });
  }, [profile, setProfile]);

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
      void Taro.navigateBack();
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
          <Button className={`settings-page__save${saving ? ' settings-page__save--loading' : ''}`} onClick={handleSave}>
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

- [ ] **Step 2: Run typecheck for the updated settings page**

Run:

```bash
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS for the settings page changes, or leave only the final stats-sync task unresolved.

- [ ] **Step 3: Manual verify the profile-to-settings-to-profile loop**

Run the app and verify:

```bash
pnpm dev:frontend
```

Expected manual result:

- Open `profile`
- Enter `settings`
- Change avatar or nickname
- Save successfully
- Navigate back
- `ProfileHeader` shows the new value immediately without reopening the app

- [ ] **Step 4: Commit the settings page sync change**

```bash
git add apps/frontend/src/pages/settings/index.tsx
git commit -m "feat(frontend): sync settings page with auth store"
```

### Task 5: Push Immediate Stat Updates From Mutation Pages

**Files:**
- Modify: `apps/frontend/src/pages/rental-detail/index.tsx`
- Modify: `apps/frontend/src/pages/share/index.tsx`

- [ ] **Step 1: Update browse and favorite counts from `rental-detail`**

In `apps/frontend/src/pages/rental-detail/index.tsx`, extend the store usage and success handlers:

```tsx
const { isLoggedIn, profileStats, patchProfileStats } = useAuthStore();
```

Then update the detail load and favorite toggle:

```tsx
Promise.all(tasks)
  .then(([data, favStatus]) => {
    setRental(data);

    const historyBefore = getBrowseHistory().length;
    saveToBrowseHistory(data);
    const historyAfter = getBrowseHistory().length;
    if (historyAfter !== historyBefore) {
      patchProfileStats({ browseCount: historyAfter });
    }

    if (favStatus) setIsFavorited(favStatus.isFavorited);
  })
```

```tsx
toggleFavorite(rental.id)
  .then((status) => {
    setIsFavorited(status.isFavorited);
    patchProfileStats({
      favoriteCount: Math.max(
        0,
        profileStats.favoriteCount + (status.isFavorited ? 1 : -1)
      )
    });
    void Taro.showToast({
      title: status.isFavorited ? '已加入收藏' : '已取消收藏',
      icon: 'none'
    });
  })
```

- [ ] **Step 2: Update publish count from `share`**

In `apps/frontend/src/pages/share/index.tsx`, add the store action:

```tsx
import { useAuthStore } from '@/shared/store';
```

```tsx
const { profileStats, patchProfileStats } = useAuthStore();
```

Then update the submit success branch:

```tsx
await createRental({
  price,
  location,
  roomType: ROOM_TYPES[roomTypeIndex],
  area: area || undefined,
  experience,
  tags: selectedTags,
  wechat: wechat || undefined,
  photos
});

patchProfileStats({
  publishCount: profileStats.publishCount + 1
});

void Taro.showToast({ title: '发布成功', icon: 'success' });
setTimeout(() => Taro.navigateBack(), 1500);
```

- [ ] **Step 3: Run lint and typecheck for the mutation pages**

Run:

```bash
pnpm --filter @rental-penpal/frontend exec eslint src/pages/rental-detail/index.tsx src/pages/share/index.tsx
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS.

- [ ] **Step 4: Manual verify the three stats update paths**

Verify in the running mini-program:

- Open a rental detail for the first time and confirm `浏览历史` increments
- Toggle favorite and confirm `我的收藏` increments or decrements
- Publish a new rental and confirm `我的发布` increments
- Reopen `profile` and confirm `useDidShow` aggregation does not regress the local values

- [ ] **Step 5: Commit the immediate stat-sync updates**

```bash
git add apps/frontend/src/pages/rental-detail/index.tsx apps/frontend/src/pages/share/index.tsx
git commit -m "feat(frontend): sync profile stats from mutation pages"
```

### Task 6: Final Verification and Cleanup

**Files:**
- Modify: `apps/frontend/src/shared/store/app-store.tsx` (only if needed to tighten deprecation comments)

- [ ] **Step 1: Run the full frontend verification suite**

Run:

```bash
pnpm --filter @rental-penpal/frontend test -- src/shared/store/auth-store.test.ts
pnpm --filter @rental-penpal/frontend exec eslint src/shared/store/auth-store.ts src/pages/profile/index.tsx src/pages/profile/components/ProfileHeader/index.tsx src/pages/settings/index.tsx src/pages/rental-detail/index.tsx src/pages/share/index.tsx
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS for tests, lint, and typecheck.

- [ ] **Step 2: Smoke-check logout reset**

Manual verification:

- Log in
- Confirm `profile` and stats are populated
- Log out from `settings`
- Return to `profile`
- Confirm nickname/avatar disappear and stats render `0 / 0 / 0`

- [ ] **Step 3: Tighten the compatibility note on `useAppStore` if it still appears in touched files**

If `app-store.tsx` needs a clearer warning, keep it minimal:

```ts
/**
 * @deprecated Use useAuthStore directly for all new code.
 */
export function useAppStore() {
  const auth = useAuthStore();
  return {
    apiBaseUrl: frontendEnv.apiBaseUrl,
    ...auth
  };
}
```

- [ ] **Step 4: Commit the final verified state**

```bash
git add apps/frontend/src/shared/store/app-store.tsx
git commit -m "chore(frontend): finalize profile settings sync cleanup"
```

## Self-Review

### Spec coverage

- Unified local truth source: covered by Task 2
- `ProfileHeader` shows real avatar, nickname, stats: covered by Task 3
- `settings` save writes back into store and returns with immediate UI sync: covered by Task 4
- Stats are store-backed and updated by mutation pages, with `profile` page as final aggregator: covered by Task 3 and Task 5
- Logout clears both profile and stats: covered by Task 2 and Task 6

### Placeholder scan

- No `TODO` / `TBD`
- Every task names exact files
- Every command is explicit
- Code steps include concrete code blocks instead of references to “the same as above”

### Type consistency

- Store API names are consistent across tasks: `setProfile`, `patchProfile`, `setProfileStats`, `patchProfileStats`
- Stats shape remains consistent everywhere: `publishCount`, `favoriteCount`, `browseCount`
- Display props remain consistent: `nickname`, `avatarUrl`, `stats`, `isLoggedIn`
