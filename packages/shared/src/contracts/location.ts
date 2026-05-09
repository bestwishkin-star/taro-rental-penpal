/** 房源的必填行政区划，发布和筛选都以这三个字段为基础。 */
/** 省市区结构化位置，用于筛选和发布表单。 */
export interface RentalRegionInput {
  province: string;
  city: string;
  district: string;
}

/** 地图选点返回的经纬度坐标。 */
/** 地图选点返回的经纬度坐标。 */
export interface RentalCoordinate {
  latitude: number;
  longitude: number;
}

/** 房源完整结构化位置：行政区划必填，详细地址和坐标可选。 */
/** 完整结构化位置：省市区加可选详细地址和坐标。 */
export interface RentalStructuredLocation extends RentalRegionInput {
  address?: string;
  latitude?: number;
  longitude?: number;
}
