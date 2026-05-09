import type { ListRentalsQuery } from '@shared/contracts/rental';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

/** 当前数据库 rentals 表是否已经具备结构化位置列。 */
export interface RentalLocationSchema {
  province: boolean;
  city: boolean;
  district: boolean;
  address: boolean;
  latitude: boolean;
  longitude: boolean;
}

const EMPTY_SCHEMA: RentalLocationSchema = {
  province: false,
  city: false,
  district: false,
  address: false,
  latitude: false,
  longitude: false
};

const REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  '\u4e0a\u6d77\u5e02/\u4e0a\u6d77\u5e02': { latitude: 31.2304, longitude: 121.4737 },
  '\u4e0a\u6d77\u5e02/\u4e0a\u6d77\u5e02/\u6d66\u4e1c\u65b0\u533a': { latitude: 31.2215, longitude: 121.5447 },
  '\u4e0a\u6d77\u5e02/\u4e0a\u6d77\u5e02/\u5f90\u6c47\u533a': { latitude: 31.1883, longitude: 121.4365 },
  '\u4e0a\u6d77\u5e02/\u4e0a\u6d77\u5e02/\u957f\u5b81\u533a': { latitude: 31.2204, longitude: 121.4222 },
  '\u4e0a\u6d77\u5e02/\u4e0a\u6d77\u5e02/\u95f5\u884c\u533a': { latitude: 31.1117, longitude: 121.3859 }
};

let schemaPromise: Promise<RentalLocationSchema> | null = null;

function normalizePart(value?: string | null) {
  return value?.trim() ?? '';
}

function buildLikePattern(value?: string | null) {
  const normalized = normalizePart(value);
  return normalized ? `%${normalized}%` : '';
}

/** 检测结构化位置列，便于新旧数据库结构平滑兼容。 */
export async function detectRentalLocationSchema(): Promise<RentalLocationSchema> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          `SELECT COLUMN_NAME AS column_name
           FROM information_schema.columns
           WHERE table_schema = DATABASE()
             AND table_name = 'rentals'
             AND COLUMN_NAME IN ('province', 'city', 'district', 'address', 'latitude', 'longitude')`
        );
        const names = new Set(
          rows
            .map((row) => String((row as { column_name?: string }).column_name ?? '').trim())
            .filter(Boolean)
        );

        return {
          province: names.has('province'),
          city: names.has('city'),
          district: names.has('district'),
          address: names.has('address'),
          latitude: names.has('latitude'),
          longitude: names.has('longitude')
        };
      } catch {
        return EMPTY_SCHEMA;
      }
    })();
  }

  return schemaPromise;
}

/** 生成 legacy location 展示文本，优先使用结构化区域和详细地址。 */
export function buildRentalLocationLabel(input: {
  location?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
}): string {
  const legacyLocation = normalizePart(input.location);
  const province = normalizePart(input.province);
  const city = normalizePart(input.city);
  const district = normalizePart(input.district);
  const address = normalizePart(input.address);

  if (!province && !city && !district) {
    return legacyLocation;
  }

  const parts: string[] = [];
  if (province) parts.push(province);
  if (city && city !== province) parts.push(city);
  if (district) parts.push(district);
  if (address) parts.push(address);
  return parts.join(' / ') || legacyLocation;
}

/** 根据查询区域查找排序中心点，区级缺失时回退到市级或省级。 */
export function resolveRegionCenter(query: Pick<ListRentalsQuery, 'province' | 'city' | 'district'>) {
  const province = normalizePart(query.province);
  const city = normalizePart(query.city);
  const district = normalizePart(query.district);

  const districtKey = [province, city, district].filter(Boolean).join('/');
  const cityKey = [province, city].filter(Boolean).join('/');
  const provinceKey = province;

  return REGION_CENTERS[districtKey] ?? REGION_CENTERS[cityKey] ?? REGION_CENTERS[provinceKey] ?? null;
}

/** 构造区域筛选 SQL 片段；旧表结构下回退为 location LIKE 匹配。 */
export function buildRegionFilterFragments(
  query: Pick<ListRentalsQuery, 'province' | 'city' | 'district'>,
  schema: RentalLocationSchema
) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  const structured = schema.province && schema.city && schema.district;

  if (structured) {
    if (normalizePart(query.province)) {
      conditions.push('province = ?');
      params.push(normalizePart(query.province));
    }
    if (normalizePart(query.city)) {
      conditions.push('city = ?');
      params.push(normalizePart(query.city));
    }
    if (normalizePart(query.district)) {
      conditions.push('district = ?');
      params.push(normalizePart(query.district));
    }
  } else {
    const provincePattern = buildLikePattern(query.province);
    const cityPattern = buildLikePattern(query.city);
    const districtPattern = buildLikePattern(query.district);

    if (provincePattern) {
      conditions.push('location LIKE ?');
      params.push(provincePattern);
    }
    if (cityPattern) {
      conditions.push('location LIKE ?');
      params.push(cityPattern);
    }
    if (districtPattern) {
      conditions.push('location LIKE ?');
      params.push(districtPattern);
    }
  }

  return { conditions, params };
}

/** 构造距离排序 SQL 片段；没有坐标列时回退为区域文本匹配优先级。 */
export function buildRegionDistanceOrderFragment(
  query: Pick<ListRentalsQuery, 'province' | 'city' | 'district'>,
  schema: RentalLocationSchema
) {
  const center = resolveRegionCenter(query);
  if (schema.latitude && schema.longitude && center) {
    return {
      clause:
        `CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 ELSE 0 END ASC, ` +
        `((latitude - ${center.latitude}) * (latitude - ${center.latitude}) + ` +
        `(longitude - ${center.longitude}) * (longitude - ${center.longitude})) ASC, created_at DESC`,
      params: [] as (string | number)[]
    };
  }

  const cases: string[] = [];
  const params: (string | number)[] = [];

  const districtPattern = buildLikePattern(query.district);
  const cityPattern = buildLikePattern(query.city);
  const provincePattern = buildLikePattern(query.province);

  if (districtPattern) {
    cases.push('WHEN location LIKE ? THEN 0');
    params.push(districtPattern);
  }
  if (cityPattern) {
    cases.push('WHEN location LIKE ? THEN 1');
    params.push(cityPattern);
  }
  if (provincePattern) {
    cases.push('WHEN location LIKE ? THEN 2');
    params.push(provincePattern);
  }

  if (!cases.length) {
    return { clause: 'created_at DESC', params };
  }

  return {
    clause: `CASE ${cases.join(' ')} ELSE 3 END ASC, created_at DESC`,
    params
  };
}

/** 判断数据库是否至少支持省市区三列。 */
export function hasStructuredLocationColumns(schema: RentalLocationSchema) {
  return schema.province && schema.city && schema.district;
}
