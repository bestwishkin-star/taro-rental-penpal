import type { RentalRegionInput } from '@shared/contracts/location';

function normalizeSegments(segments: string[]) {
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

/** 将行政区划和可选详细地址拼成兼容旧字段的展示位置。 */
export function buildDisplayLocation(region: RentalRegionInput, address?: string) {
  const province = region.province.trim();
  const city = region.city.trim();
  const district = region.district.trim();
  const regionSegments = province === city ? [province, district] : [province, city, district];
  const addressSegments = address?.trim() ? [address.trim()] : [];

  return [...normalizeSegments(regionSegments), ...addressSegments].join(' / ');
}

/** 判断切换行政区后是否需要清空旧的地图选点地址和坐标。 */
export function shouldClearPreciseLocation(
  nextRegion: RentalRegionInput,
  previousRegion?: RentalRegionInput | null
) {
  if (!previousRegion) return false;

  return (
    nextRegion.province !== previousRegion.province ||
    nextRegion.city !== previousRegion.city ||
    nextRegion.district !== previousRegion.district
  );
}

/** 找房页区域筛选的摘要文案，未选择时返回空状态文案。 */
export function formatRegionSummary(region: RentalRegionInput | null) {
  if (!region) return 'All regions';
  return buildDisplayLocation(region);
}
