import { Image, Text, View } from '@tarojs/components';

import iconLock from '@/assets/icons/common/icon-lock.png';

import './index.scss';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
}

export function LoginModal({ visible, onClose, onLogin }: LoginModalProps) {
  if (!visible) return null;

  const handleLogin = () => {
    onLogin();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <View className="login-modal">
      <View className="login-modal__overlay" onClick={handleCancel}>
        <View className="login-modal__card" onClick={(e) => e.stopPropagation()}>
          <View className="login-modal__header">
            <Image src={iconLock} className="login-modal__icon" mode="aspectFit" />
            <Text className="login-modal__title">需要登录</Text>
            <Text className="login-modal__desc">登录后即可查看个人信息和使用更多功能</Text>
          </View>

          <View className="login-modal__buttons">
            <View
              className="login-modal__button login-modal__button--primary"
              hoverClass="login-modal__button--active"
              onClick={handleLogin}
            >
              <Text className="login-modal__button-text login-modal__button-text--primary">
                微信快捷登录
              </Text>
            </View>

            <View
              className="login-modal__button login-modal__button--secondary"
              hoverClass="login-modal__button--active"
              onClick={handleCancel}
            >
              <Text className="login-modal__button-text login-modal__button-text--secondary">
                暂不登录
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
