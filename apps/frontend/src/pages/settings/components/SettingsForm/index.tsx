import type { UserProfileInput } from '@shared/contracts/user';

import { Input, Text, Textarea, View } from '@tarojs/components';

import './index.scss';

interface Props {
  values: UserProfileInput;
  onChange: (key: keyof UserProfileInput, value: string) => void;
}

interface RowProps {
  label: string;
  value: string;
  placeholder?: string;
  onInput: (value: string) => void;
  multiline?: boolean;
}

function SettingsRow({ label, value, placeholder = '请填写', onInput, multiline = false }: RowProps) {
  return (
    <View className="settings-row">
      <Text className="settings-row__label">{label}</Text>
      {multiline ? (
        <Textarea
          className="settings-row__textarea"
          value={value}
          placeholder={placeholder}
          onInput={(e) => onInput(e.detail.value)}
          autoHeight
        />
      ) : (
        <Input
          className="settings-row__input"
          value={value}
          placeholder={placeholder}
          onInput={(e) => onInput(e.detail.value)}
        />
      )}
    </View>
  );
}

export function SettingsForm({ values, onChange }: Props) {
  return (
    <View className="settings-form">
      <View className="settings-form__section">
        <Text className="settings-form__section-title">基本信息</Text>
        <View className="settings-form__group">
          <SettingsRow
            label="昵称"
            value={values.nickname}
            placeholder="请输入昵称"
            onInput={(v) => onChange('nickname', v)}
          />
        </View>
      </View>

      <View className="settings-form__section">
        <Text className="settings-form__section-title">租房偏好</Text>
        <View className="settings-form__group">
          <SettingsRow
            label="城市"
            value={values.city}
            placeholder="如：上海"
            onInput={(v) => onChange('city', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="预算"
            value={values.budget}
            placeholder="如：3000-5000"
            onInput={(v) => onChange('budget', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="偏好区域"
            value={values.preferredDistrict}
            placeholder="如：浦东新区"
            onInput={(v) => onChange('preferredDistrict', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="入住日期"
            value={values.moveInDate}
            placeholder="如：2026-06-01"
            onInput={(v) => onChange('moveInDate', v)}
          />
          <View className="settings-form__divider" />
          <SettingsRow
            label="室友期望"
            value={values.roommateExpectation}
            placeholder="描述你期望的室友"
            onInput={(v) => onChange('roommateExpectation', v)}
            multiline
          />
        </View>
      </View>
    </View>
  );
}
