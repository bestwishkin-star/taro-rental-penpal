import { useState } from 'react';

import { Button, View } from '@tarojs/components';
import Taro, { useLoad } from '@tarojs/taro';

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

export default function SettingsPage() {
  const { setProfile, handleLogout } = useAuthStore();
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState<UserProfileInput>(defaultForm);
  const [saving, setSaving] = useState(false);

  useLoad(() => {
    fetchUserProfile()
      .then((profile) => {
        setAvatarUrl(profile.avatarUrl);
        setForm({
          nickname: profile.nickname,
          city: profile.city,
          budget: profile.budget,
          preferredDistrict: profile.preferredDistrict,
          moveInDate: profile.moveInDate,
          roommateExpectation: profile.roommateExpectation
        });
      })
      .catch(() => {
        void Taro.showToast({ title: '加载失败', icon: 'none', duration: 2000 });
      });
  });

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
