import { Image, Input, View } from '@tarojs/components';

import iconSearch from '@/assets/icons/find/icon-search.png';

import './index.scss';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** 发现页搜索栏：按故事正文和标题关键词检索。 */
export function SearchBar({ value, onChange }: Props) {
  return (
    <View className="search-bar">
      <Image src={iconSearch} className="search-bar__icon" mode="aspectFit" />
      <Input
        className="search-bar__input"
        placeholder="搜索屋檐故事、照片里的生活细节..."
        placeholderClass="search-bar__placeholder"
        value={value}
        onInput={(e) => onChange(e.detail.value)}
        confirmType="search"
      />
    </View>
  );
}
