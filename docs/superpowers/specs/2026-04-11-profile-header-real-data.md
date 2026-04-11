# ProfileHeader 真实数据接入 设计文档

**日期**: 2026-04-11
**状态**: 已审批

## 概述

`ProfileHeader` 组件当前有三处非真实数据：stats 硬编码为 0、头像未渲染、昵称不刷新。本次修复让这三处均接入真实 API 数据。

---

## 修改范围

| 文件 | 改动 |
|------|------|
| `apps/frontend/src/pages/profile/index.tsx` | 修复 `useAppStore` → `useAuthStore`；`useDidShow` 加载真实数据；传 `avatarUrl` + `stats` |
| `apps/frontend/src/pages/profile/components/ProfileHeader/index.tsx` | 新增 `avatarUrl?: string` prop；渲染真实头像 |

不新增组件，不修改 store，不新增 API。

---

## 数据流

```
useDidShow（已登录）
  ├── fetchUserProfile()       → setProfile(result)，avatarUrl 写入 store
  ├── fetchMyRentals()         → .length → publishCount
  ├── fetchFavorites()         → .length → favoriteCount
  └── getBrowseHistory()       → .length → browseCount（同步，本地）
```

三个异步请求用 `Promise.allSettled` 并行发起，任意失败只影响对应 stat，其余正常展示。

---

## ProfileHeader 组件变更

### Props 变更

```ts
interface Props {
  nickname?: string;
  avatarUrl?: string;   // 新增
  isLoggedIn: boolean;
  stats?: StatItem[];
  onClick?: () => void;
}
```

### 渲染逻辑

```tsx
// 有 avatarUrl 时显示真实头像，否则保留占位 View
{avatarUrl
  ? <Image src={avatarUrl} className="profile-header__avatar" mode="aspectFill" />
  : <View className="profile-header__avatar" />
}
```

---

## profile/index.tsx 变更

### 新增页面状态

```ts
const [publishCount, setPublishCount] = useState(0);
const [favoriteCount, setFavoriteCount] = useState(0);
const [browseCount, setBrowseCount] = useState(0);
```

### useDidShow 数据加载

```ts
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
```

### ProfileHeader 传参

```tsx
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
```

---

## 错误处理

| 场景 | 处理 |
|------|------|
| 任意 API 失败 | `Promise.allSettled` 静默降级，对应 stat 保持 0 |
| `fetchUserProfile` 失败 | 保持 store 现有 profile，不影响页面展示 |
| 未登录 | 跳过所有请求，stats 保持 0，ProfileHeader 显示未登录状态 |

---

## 不在范围内

- stats 加载中的骨架屏或 loading 状态
- 发布/收藏/浏览的专属计数接口（直接用现有列表接口 `.length`）
- ProfileHeader 样式改动（头像样式 class 复用现有 `.profile-header__avatar`）
