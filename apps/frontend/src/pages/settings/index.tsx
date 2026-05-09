import type { UserProfile, UserProfileInput } from '@shared/contracts/user';
import { Button, ScrollView, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { fetchUserProfile, saveUserProfile } from '@/shared/api/services';
import { useAuthStore } from '@/shared/store';
import { PageShell } from '@/shared/ui/page-shell';

import { SettingsAvatar } from './components/SettingsAvatar';
import { SettingsForm } from './components/SettingsForm';

import './index.scss';

// 设置页默认表单，保证未加载资料时也有完整字段结构。
const defaultForm: UserProfileInput = {
  nickname: '',
  city: '',
  budget: '',
  preferredDistrict: '',
  moveInDate: '',
  roommateExpectation: ''
};

/** 将后端用户资料转换成表单可编辑的数据结构。 */
function toForm(profile: UserProfile | null): UserProfileInput {
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

/** 设置页：编辑头像、昵称和租房偏好，并提供退出登录。 */
export default function SettingsPage() {
  const { profile, setProfile, handleLogout } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [form, setForm] = useState<UserProfileInput>(() => toForm(profile));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // store 中资料变化后，同步回本页表单。
    setAvatarUrl(profile?.avatarUrl || '');
    setForm(toForm(profile));
  }, [profile]);

  useEffect(() => {
    // 直接进入设置页且本地无资料时，主动拉取一次用户资料。
    if (profile) return;

    fetchUserProfile()
      .then((nextProfile) => {
        setProfile(nextProfile);
      })
      .catch(() => {
        void Taro.showToast({ title: '资料加载失败', icon: 'none', duration: 2000 });
      });
  }, [profile, setProfile]);

  /** 更新指定表单字段，保持表单对象不可变。 */
  function handleChange(key: keyof UserProfileInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** 保存用户资料，成功后更新全局 profile 并返回上一页。 */
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

  /** 退出登录并回到个人中心。 */
  function handleLogoutClick() {
    handleLogout();
    void Taro.navigateBack();
  }

  return (
    <PageShell scrollEnabled={false} contentClassName="settings-page-shell">
      <View className="settings-page">
        {/* 表单主体：头像选择与基础资料字段。 */}
        <ScrollView scrollY showScrollbar={false} className="settings-page__body">
          <View className="settings-page__body-inner">
            <SettingsAvatar avatarUrl={avatarUrl} onChange={setAvatarUrl} />
            <SettingsForm values={form} onChange={handleChange} />
          </View>
        </ScrollView>

        {/* 底部操作区：保存资料或退出登录。 */}
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
