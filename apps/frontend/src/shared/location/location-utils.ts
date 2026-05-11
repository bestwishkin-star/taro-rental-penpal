import type { RentalRegionInput } from '@shared/contracts/location';

function normalizeSegments(segments: string[]) {
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

/** 将省市区和可选地址拼成界面展示位置。 */
export function buildDisplayLocation(region: RentalRegionInput, address?: string) {
  const province = region.province.trim();
  const city = region.city.trim();
  const district = region.district.trim();
  const regionSegments = province === city ? [province, district] : [province, city, district];
  const addressSegments = address?.trim() ? [address.trim()] : [];

  return [...normalizeSegments(regionSegments), ...addressSegments].join(' / ');
}

/** 判断区域变化后是否需要清空精确位置。 */
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

/** 发现页区域筛选摘要文案，未选择时返回空状态文案。 */
export function formatRegionSummary(region: RentalRegionInput | null) {
  if (!region) return '全部区域';
  return buildDisplayLocation(region);
}
