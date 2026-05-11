import { Image, Input, View } from '@tarojs/components';

import iconFilterBtn from '@/assets/icons/find/icon-filter-btn.png';
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
      <View className="search-bar__input-wrap">
        <Image src={iconSearch} className="search-bar__icon" mode="aspectFit" />
        <Input
          className="search-bar__input"
          placeholder="搜索城市、地标、体验关键词..."
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
