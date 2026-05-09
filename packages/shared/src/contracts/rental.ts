import type { RentalStructuredLocation } from './location';

/** 房源状态：active 表示上架，inactive 表示下架。 */
export type RentalStatus = 'active' | 'inactive';

/** 列表卡片使用的房源数据，保留 legacy location，同时兼容结构化位置字段。 */
/** 房源列表项：用于列表卡片、收藏列表和浏览历史。 */
export interface RentalListing {
  id: string;
  title: string;
  location: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  price: string;
  area: string;
  roomType: string;
  tags: string[];
  photos: string[];
  status: RentalStatus;
}

/** 房源列表查询参数，区域筛选使用 province/city/district 逐级精确匹配。 */
/** 房源列表查询参数：支持关键词、筛选、排序、分页和地区。 */
export interface ListRentalsQuery {
  keyword?: string;
  filter?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
  priceRange?: 'lt2000' | '2000to4000' | 'gt4000';
  province?: string;
  city?: string;
  district?: string;
}

/** 房源详情比列表多出正文描述和联系方式。 */
/** 房源详情：在列表项基础上补充描述和联系方式。 */
export interface RentalDetail extends RentalListing {
  experience: string;
  wechat: string;
}

/** 发布房源入参，结构化位置必填，同时继续传 location 作为展示文本。 */
/** 发布房源入参：包含结构化位置、基础信息、标签和图片。 */
export interface CreateRentalInput extends RentalStructuredLocation {
  price: string;
  location: string;
  roomType: string;
  area?: string;
  experience: string;
  tags: string[];
  wechat?: string;
  photos: string[];
}

/** 发布成功后返回的新房源 ID。 */
/** 发布房源响应：返回新创建的房源 id。 */
export interface CreateRentalResponse {
  id: string;
}

/** 当前用户对某个房源的收藏状态。 */
/** 收藏状态：表示当前用户是否已收藏某个房源。 */
export interface FavoriteStatus {
  isFavorited: boolean;
}

/** 房源上下架状态更新入参。 */
/** 更新房源上下架状态的接口入参。 */
export interface UpdateRentalStatusInput {
  status: RentalStatus;
}