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

/** 个人中心页：维护登录态入口、用户数据和个人房源相关快捷入口。 */
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
    // 个人中心每次展示时刷新用户资料、发布数、收藏数和浏览记录数量。
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
        publishCount:
          mineResult.status === 'fulfilled' ? mineResult.value.length : profileStats.publishCount,
        favoriteCount:
          favoriteResult.status === 'fulfilled'
            ? favoriteResult.value.length
            : profileStats.favoriteCount,
        browseCount:
          historyResult.status === 'fulfilled'
            ? historyResult.value.length
            : profileStats.browseCount
      });
    });
  });

  /** 未登录时点击头像区域，打开登录弹窗。 */
  function handleHeaderClick() {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
  }

  /** 调用小程序登录并用 code 换取后端登录态。 */
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

  /** 跳转到指定房源列表，未登录用户只能查看本地浏览历史。 */
  function navigateTo(type: 'mine' | 'favorites' | 'history') {
    if (!isLoggedIn && type !== 'history') {
      setShowLoginModal(true);
      return;
    }

    void Taro.navigateTo({ url: `/pages/rental-list/index?type=${type}` });
  }

  /** 跳转个人设置页；未登录时先要求登录。 */
  function navigateToSettings() {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    void Taro.navigateTo({ url: '/pages/settings/index' });
  }

  return (
    <PageShell>
      {/* 用户信息头部：头像、昵称和发布/收藏/浏览统计。 */}
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

      {/* 功能菜单区：我的发布、收藏、浏览历史和设置入口。 */}
      <View className="profile-menu">
        <ProfileMenuItem
          icon={iconPublish}
          label="我的发布"
          desc="查看我发布的找室友和房源信息"
          onClick={() => navigateTo('mine')}
        />
        <ProfileMenuItem
          icon={iconFavorite}
          label="我的收藏"
          desc="查看我收藏的房源"
          onClick={() => navigateTo('favorites')}
        />
        <ProfileMenuItem
          icon={iconHistory}
          label="浏览历史"
          desc="查看我最近浏览过的房源"
          onClick={() => navigateTo('history')}
        />
        <ProfileMenuItem
          icon={iconSettings}
          label="设置"
          desc="编辑头像、昵称和租房偏好"
          onClick={navigateToSettings}
        />
      </View>

      {/* 登录弹窗：统一承载微信登录触发入口。 */}
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </PageShell>
  );
}
