import { View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { login } from '@/shared/api/services';
import { useAppStore } from '@/shared/store/app-store';
import { LoginModal } from '@/shared/ui/login-modal';
import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import { ProfileHeader } from './components/ProfileHeader';
import { ProfileMenuItem } from './components/ProfileMenuItem';

import './index.scss';

export default function ProfilePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isLoggedIn, profile, handleLoginSuccess } = useAppStore();

  useDidShow(() => {
    setTabBarSelected(2);
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

  function handleMenuClick() {
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    void Taro.showToast({ title: '功能开发中', icon: 'none', duration: 2000 });
  }

  function navigateTo(type: 'mine' | 'favorites' | 'history') {
    if (!isLoggedIn && type !== 'history') { setShowLoginModal(true); return; }
    void Taro.navigateTo({ url: `/pages/rental-list/index?type=${type}` });
  }

  return (
    <PageShell>
      <ProfileHeader
        isLoggedIn={isLoggedIn}
        nickname={profile?.nickname}
        onClick={handleHeaderClick}
      />

      <View className="profile-menu">
        <ProfileMenuItem
          icon="🏠"
          iconVariant="house"
          label="我的发布"
          desc="查看我发布的房源"
          onClick={() => navigateTo('mine')}
        />
        <ProfileMenuItem
          icon="❤️"
          iconVariant="heart"
          label="我的收藏"
          desc="查看收藏的房源"
          onClick={() => navigateTo('favorites')}
        />
        <ProfileMenuItem
          icon="👀"
          iconVariant="history"
          label="浏览历史"
          desc="最近看过的房源"
          onClick={() => navigateTo('history')}
        />
        <ProfileMenuItem
          icon="⚙️"
          iconVariant="settings"
          label="设置"
          desc="账号与隐私设置"
          onClick={handleMenuClick}
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
