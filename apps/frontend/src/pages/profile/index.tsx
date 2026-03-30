import { Text, View } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';

import { login } from '@/shared/api/services';
import { useAppStore } from '@/shared/store/app-store';
import { LoginModal } from '@/shared/ui/login-modal';
import { PageShell } from '@/shared/ui/page-shell';
import { setTabBarSelected } from '@/shared/utils/tab-bar';

import './index.scss';

export default function ProfilePage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isLoggedIn, profile, handleLoginSuccess } = useAppStore();

  useDidShow(() => {
    setTabBarSelected(2);
  });

  const handleHeaderClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    }
  };

  const handleLogin = () => {
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
  };

  const handleMenuClick = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    void Taro.showToast({ title: '功能开发中', icon: 'none', duration: 2000 });
  };

  return (
    <PageShell>
      <View
        className="profile-header"
        hoverClass="profile-header--active"
        onClick={handleHeaderClick}
      >
        <View className="profile-header__top">
          <View className="profile-avatar" />
          <View className="profile-user-info">
            <Text className="profile-user-info__name">
              {isLoggedIn ? (profile?.nickname ?? '租房用户') : '未登录'}
            </Text>
            <Text className="profile-user-info__desc">
              {isLoggedIn ? '完善个人信息，提升信任度' : '点击登录查看更多功能'}
            </Text>
          </View>
        </View>
        <View className="profile-stats">
          <View className="profile-stat">
            <Text className="profile-stat__value">0</Text>
            <Text className="profile-stat__label">发布</Text>
          </View>
          <View className="profile-stat">
            <Text className="profile-stat__value">0</Text>
            <Text className="profile-stat__label">收藏</Text>
          </View>
          <View className="profile-stat">
            <Text className="profile-stat__value">0</Text>
            <Text className="profile-stat__label">浏览</Text>
          </View>
        </View>
      </View>

      <View className="profile-menu">
        <View
          className="profile-menu-item"
          hoverClass="profile-menu-item--active"
          onClick={handleMenuClick}
        >
          <View className="profile-menu-item__icon profile-menu-item__icon--user">
            <Text className="profile-menu-item__icon-text">👤</Text>
          </View>
          <View className="profile-menu-item__body">
            <Text className="profile-menu-item__label">个人资料</Text>
            <Text className="profile-menu-item__desc">编辑个人信息和头像</Text>
          </View>
          <Text className="profile-menu-item__arrow">›</Text>
        </View>

        <View
          className="profile-menu-item"
          hoverClass="profile-menu-item--active"
          onClick={handleMenuClick}
        >
          <View className="profile-menu-item__icon profile-menu-item__icon--heart">
            <Text className="profile-menu-item__icon-text">❤️</Text>
          </View>
          <View className="profile-menu-item__body">
            <Text className="profile-menu-item__label">我的收藏</Text>
            <Text className="profile-menu-item__desc">查看收藏的房源</Text>
          </View>
          <Text className="profile-menu-item__arrow">›</Text>
        </View>

        <View
          className="profile-menu-item"
          hoverClass="profile-menu-item--active"
          onClick={handleMenuClick}
        >
          <View className="profile-menu-item__icon profile-menu-item__icon--settings">
            <Text className="profile-menu-item__icon-text">⚙️</Text>
          </View>
          <View className="profile-menu-item__body">
            <Text className="profile-menu-item__label">设置</Text>
            <Text className="profile-menu-item__desc">账号与隐私设置</Text>
          </View>
          <Text className="profile-menu-item__arrow">›</Text>
        </View>
      </View>

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </PageShell>
  );
}
