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

const defaultForm: UserProfileInput = {
  nickname: '',
  city: '',
  budget: '',
  preferredDistrict: '',
  moveInDate: '',
  roommateExpectation: ''
};

/** 将用户资料转换为设置页表单初始值。 */
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

/** 设置页：编辑头像、昵称和居住偏好，并提供退出登录。 */
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

  /** 更新设置表单的单个字段。 */
  function handleChange(key: keyof UserProfileInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** 保存资料并同步到全局登录状态。 */
  async function handleSave() {
    if (saving) return;
    setSaving(true);

    try {
      const updated = await saveUserProfile({ ...form, avatarUrl });
      setProfile(updated);
      void Taro.showToast({ title: '保存成功', icon: 'success', duration: 2000 });
      void Taro.navigateBack();
    } catch {
      void Taro.showToast({ title: '保存失败，请稍后再试', icon: 'none', duration: 2000 });
    } finally {
      setSaving(false);
    }
  }

  /** 退出当前账号并返回上一页。 */
  function handleLogoutClick() {
    handleLogout();
    void Taro.navigateBack();
  }

  return (
    <PageShell scrollEnabled={false} contentClassName="settings-page-shell">
      <View className="settings-page">
        <ScrollView scrollY showScrollbar={false} className="settings-page__body">
          <View className="settings-page__body-inner">
            <SettingsAvatar avatarUrl={avatarUrl} onChange={setAvatarUrl} />
            <SettingsForm values={form} onChange={handleChange} />
          </View>
        </ScrollView>

        <View className="settings-page__actions">
          <Button
            className={`settings-page__save${saving ? ' settings-page__save--loading' : ''}`}
            onClick={handleSave}
          >
            保存资料
          </Button>
          <Button className="settings-page__logout" onClick={handleLogoutClick}>
            退出登录
          </Button>
        </View>
      </View>
    </PageShell>
  );
}
