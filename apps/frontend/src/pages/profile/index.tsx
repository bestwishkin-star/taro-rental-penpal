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

  function handleHeaderClick() {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
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

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </PageShell>
  );
}
