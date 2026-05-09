import type { RentalRegionInput } from '@shared/contracts/location';

const SHANGHAI_DISTRICTS = [
  '浦东新区',
  '徐汇区',
  '长宁区',
  '闵行区',
  '黄浦区',
  '静安区',
  '普陀区',
  '虹口区',
  '杨浦区',
  '宝山区',
  '嘉定区',
  '松江区'
];

/** Taro multiSelector 使用的省、市、区三列选项。 */
export const REGION_COLUMNS = [['上海市'], ['上海市'], SHANGHAI_DISTRICTS];

/** 将 multiSelector 的三列下标转换为结构化区域对象。 */
export function getRegionByIndexes(indexes: number[]): RentalRegionInput {
  const provinceIndex = indexes[0] ?? 0;
  const cityIndex = indexes[1] ?? 0;
  const districtIndex = indexes[2] ?? 0;

  return {
    province: REGION_COLUMNS[0][provinceIndex] ?? REGION_COLUMNS[0][0],
    city: REGION_COLUMNS[1][cityIndex] ?? REGION_COLUMNS[1][0],
    district: REGION_COLUMNS[2][districtIndex] ?? REGION_COLUMNS[2][0]
  };
}

/** 将已选区域反查为 multiSelector 的三列下标，未命中时回退到第一项。 */
export function findRegionIndexes(region: RentalRegionInput | null): number[] {
  if (!region) return [0, 0, 0];

  return [
    Math.max(0, REGION_COLUMNS[0].indexOf(region.province)),
    Math.max(0, REGION_COLUMNS[1].indexOf(region.city)),
    Math.max(0, REGION_COLUMNS[2].indexOf(region.district))
  ];
}
