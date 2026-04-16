import type { RentalRegionInput } from '@shared/contracts/location';

function normalizeSegments(segments: string[]) {
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

export function buildDisplayLocation(region: RentalRegionInput, address?: string) {
  const province = region.province.trim();
  const city = region.city.trim();
  const district = region.district.trim();
  const regionSegments = province === city ? [province, district] : [province, city, district];
  const addressSegments = address?.trim() ? [address.trim()] : [];

  return [...normalizeSegments(regionSegments), ...addressSegments].join(' / ');
}

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
