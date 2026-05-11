import { Image, Input, View } from '@tarojs/components';

import iconSearch from '@/assets/icons/find/icon-search.png';

import './index.scss';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** 发现页搜索栏：输入关键词并保留筛选入口图标。 */
export function SearchBar({ value, onChange }: Props) {
  return (
    <View className="search-bar">
      <Image src={iconSearch} className="search-bar__icon" mode="aspectFit" />
      <Input
        className="search-bar__input"
        placeholder="搜索城市、地标、通勤、隔音..."
        placeholderClass="search-bar__placeholder"
        value={value}
        onInput={(e) => onChange(e.detail.value)}
        confirmType="search"
      />
    </View>
  );
}
