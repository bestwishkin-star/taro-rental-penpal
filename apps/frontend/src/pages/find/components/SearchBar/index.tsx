import { Image, Input, View } from '@tarojs/components';

import iconSearch from '@/assets/icons/find/icon-search.png';

import './index.scss';

/** 搜索栏受控属性。 */
interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** 发现页搜索栏：按房屋实录正文、标题和作者检索。 */
export function SearchBar({ value, onChange }: Props) {
  return (
    <View className="search-bar">
      <Image src={iconSearch} className="search-bar__icon" mode="aspectFit" />
      <Input
        className="search-bar__input"
        placeholder="搜索房屋实录、生活细节或记录者..."
        placeholderClass="search-bar__placeholder"
        value={value}
        onInput={(e) => onChange(e.detail.value)}
        confirmType="search"
      />
    </View>
  );
}
