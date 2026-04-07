import { Image, Input, View } from '@tarojs/components';

import iconFilterBtn from '@/assets/icons/find/icon-filter-btn.png';
import iconSearch from '@/assets/icons/find/icon-search.png';

import './index.scss';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <View className="search-bar">
      <View className="search-bar__input-wrap">
        <Image src={iconSearch} className="search-bar__icon" mode="aspectFit" />
        <Input
          className="search-bar__input"
          placeholder="搜索小区、地铁站..."
          placeholderClass="search-bar__placeholder"
          value={value}
          onInput={(e) => onChange(e.detail.value)}
          confirmType="search"
        />
      </View>
      <View className="search-bar__filter-btn">
        <Image src={iconFilterBtn} className="search-bar__filter-icon" mode="aspectFit" />
      </View>
    </View>
  );
}
