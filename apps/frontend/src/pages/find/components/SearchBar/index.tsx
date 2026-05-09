import { Image, Input, View } from '@tarojs/components';

import iconFilterBtn from '@/assets/icons/find/icon-filter-btn.png';
import iconSearch from '@/assets/icons/find/icon-search.png';

import './index.scss';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** 找房搜索栏：输入关键词并保留筛选入口图标。 */
export function SearchBar({ value, onChange }: Props) {
  return (
    <View className="search-bar">
      {/* 搜索输入区：变更后由页面层做防抖请求。 */}
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
      {/* 视觉筛选按钮：实际筛选控件在下方 FilterChips 和 RegionFilter。 */}
      <View className="search-bar__filter-btn">
        <Image src={iconFilterBtn} className="search-bar__filter-icon" mode="aspectFit" />
      </View>
    </View>
  );
}
