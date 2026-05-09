# Map-Assisted Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add structured rental location data so the share page can capture province/city/district plus optional map-selected address and coordinates, while the find page can filter by region and sort by distance to the selected region center.

**Architecture:** Keep `location` as the legacy display string, but introduce structured fields in the shared rental contract and carry them through backend storage and frontend forms. The share page becomes the only authoring entry for structured location, and the find page consumes those fields through new region filters and a region-center sort path without introducing a map page.

**Tech Stack:** Taro React, Zustand, Next.js route handlers, MySQL, TypeScript, Vitest

---

## File Structure

### Existing files to modify

- `packages/shared/src/contracts/rental.ts`
  Add structured location types and extend rental query / create payload contracts.
- `packages/shared/src/index.ts`
  Re-export any new rental types if needed by consumers.
- `apps/backend/src/app/api/rentals/route.ts`
  Parse new query params and validate the stronger publish payload.
- `apps/backend/src/modules/rentals/rental.service.ts`
  Keep service signatures aligned with the new query and create payload shape.
- `apps/backend/src/modules/rentals/rental.repository.ts`
  Persist structured location fields, filter by region, and implement region-center distance ordering.
- `apps/frontend/src/shared/api/services.ts`
  Pass new query parameters and payload fields to the backend.
- `apps/frontend/src/pages/share/index.tsx`
  Replace free-text location entry with required region selection and optional detailed address actions.
- `apps/frontend/src/pages/share/index.scss`
  Style the new location section and action buttons without breaking the current page layout.
- `apps/frontend/src/pages/find/index.tsx`
  Hold selected region filter state and send it to `fetchRentals`.
- `apps/frontend/src/pages/find/components/FilterChips/index.tsx`
  Continue handling room type and price chips while making room for a new region control.
- `apps/frontend/src/pages/find/components/SortBar/index.tsx`
  Add the region-distance sort label and keep wording aligned with the approved UX.
- `apps/frontend/src/pages/find/index.scss`
  Make room for the new region summary / controls without regressing scrolling behavior.

### New files to create

- `packages/shared/src/contracts/location.ts`
  Shared region and coordinate types used by both apps.
- `apps/backend/src/modules/rentals/location-utils.ts`
  Small pure helpers for display-string assembly, center-point lookup, and distance SQL fragments.
- `apps/frontend/src/shared/location/region-options.ts`
  Lightweight province/city/district option source for the supported initial rollout area.
- `apps/frontend/src/shared/location/wechat-location.ts`
  Wrapper around `Taro.chooseLocation` and address normalization, isolated from page code.
- `apps/frontend/src/pages/share/components/RegionField/index.tsx`
  Dedicated share-page region picker UI.
- `apps/frontend/src/pages/share/components/RegionField/index.scss`
  Region picker styling.
- `apps/frontend/src/pages/share/components/AddressActions/index.tsx`
  Buttons for `地图选位置` and `搜索地址`, plus current address preview.
- `apps/frontend/src/pages/share/components/AddressActions/index.scss`
  Address action styling.
- `apps/frontend/src/pages/find/components/RegionFilter/index.tsx`
  Region selector for the find page.
- `apps/frontend/src/pages/find/components/RegionFilter/index.scss`
  Region selector styling.
- `apps/frontend/src/shared/location/location-utils.test.ts`
  Unit tests for frontend location normalization / reset behavior.
- `apps/backend/src/modules/rentals/location-utils.test.ts`
  Unit tests for display assembly and center-point fallback logic if backend test setup is added; otherwise this task will instead verify logic through extracted pure functions compiled under `typecheck`.

## Task 1: Shared Contracts And Location Primitives

**Files:**
- Create: `packages/shared/src/contracts/location.ts`
- Modify: `packages/shared/src/contracts/rental.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `apps/frontend/src/shared/location/location-utils.test.ts`

- [ ] **Step 1: Write the failing shared-shape test for normalized location data**

```ts
import { describe, expect, it } from 'vitest';

import type { RentalRegionInput } from '@shared/contracts/location';
import { buildDisplayLocation, shouldClearPreciseLocation } from './location-utils';

describe('location utils', () => {
  it('builds display text from region and optional address', () => {
    const region: RentalRegionInput = {
      province: '上海市',
      city: '上海市',
      district: '浦东新区'
    };

    expect(buildDisplayLocation(region, '')).toBe('上海市 / 浦东新区');
    expect(buildDisplayLocation(region, '张江高科地铁站')).toBe('上海市 / 浦东新区 / 张江高科地铁站');
  });

  it('clears precise address when district changes', () => {
    expect(
      shouldClearPreciseLocation(
        { province: '上海市', city: '上海市', district: '浦东新区' },
        { province: '上海市', city: '上海市', district: '徐汇区' }
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails because the new types / helpers do not exist yet**

Run: `pnpm --filter @rental-penpal/frontend test -- src/shared/location/location-utils.test.ts`

Expected: FAIL with module resolution errors such as `Cannot find module './location-utils'` or missing exported types.

- [ ] **Step 3: Define shared location contracts and the minimal frontend helper shape**

```ts
// packages/shared/src/contracts/location.ts
export interface RentalRegionInput {
  province: string;
  city: string;
  district: string;
}

export interface RentalCoordinate {
  latitude: number;
  longitude: number;
}

export interface RentalStructuredLocation extends RentalRegionInput {
  address?: string;
  latitude?: number;
  longitude?: number;
}
```

```ts
// packages/shared/src/contracts/rental.ts
import type { RentalStructuredLocation } from './location';

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
```

```ts
// apps/frontend/src/shared/location/location-utils.ts
import type { RentalRegionInput } from '@shared/contracts/location';

export function buildDisplayLocation(region: RentalRegionInput, address?: string) {
  return address?.trim()
    ? `${region.city} / ${region.district} / ${address.trim()}`
    : `${region.city} / ${region.district}`;
}

export function shouldClearPreciseLocation(nextRegion: RentalRegionInput, prevRegion?: RentalRegionInput | null) {
  if (!prevRegion) return false;
  return (
    nextRegion.province !== prevRegion.province ||
    nextRegion.city !== prevRegion.city ||
    nextRegion.district !== prevRegion.district
  );
}
```

- [ ] **Step 4: Run the focused frontend unit test and shared typecheck**

Run: `pnpm --filter @rental-penpal/frontend test -- src/shared/location/location-utils.test.ts`

Expected: PASS

Run: `pnpm typecheck`

Expected: PASS or only known unrelated workspace issues.

- [ ] **Step 5: Commit the contract layer**

```bash
git add packages/shared/src/contracts/location.ts packages/shared/src/contracts/rental.ts packages/shared/src/index.ts apps/frontend/src/shared/location/location-utils.ts apps/frontend/src/shared/location/location-utils.test.ts
git commit -m "feat(shared): add structured rental location contracts"
```

## Task 2: Backend Persistence, Query Parsing, And Distance Sorting

**Files:**
- Modify: `apps/backend/src/app/api/rentals/route.ts`
- Modify: `apps/backend/src/modules/rentals/rental.service.ts`
- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`
- Create: `apps/backend/src/modules/rentals/location-utils.ts`
- Test: `apps/backend/src/modules/rentals/location-utils.test.ts`

- [ ] **Step 1: Write the failing backend helper test for display assembly and center fallback**

```ts
import { describe, expect, it } from 'vitest';

import { buildRentalLocationLabel, resolveRegionCenter } from './location-utils';

describe('backend location utils', () => {
  it('builds display location with optional detailed address', () => {
    expect(buildRentalLocationLabel('上海市', '浦东新区', '')).toBe('上海市 / 浦东新区');
    expect(buildRentalLocationLabel('上海市', '浦东新区', '张江高科地铁站')).toBe(
      '上海市 / 浦东新区 / 张江高科地铁站'
    );
  });

  it('falls back from district center to city center', () => {
    expect(resolveRegionCenter({ province: '上海市', city: '上海市', district: '不存在的区' })).toEqual({
      latitude: 31.2304,
      longitude: 121.4737
    });
  });
});
```

- [ ] **Step 2: Run the backend check to confirm the helper is not implemented yet**

Run: `pnpm --filter @rental-penpal/backend typecheck`

Expected: FAIL on missing `location-utils.ts` exports or new fields not yet declared.

- [ ] **Step 3: Implement backend location helpers and wire them into repository reads / writes**

```ts
// apps/backend/src/modules/rentals/location-utils.ts
import type { ListRentalsQuery } from '@shared/contracts/rental';

const REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  '上海市/上海市': { latitude: 31.2304, longitude: 121.4737 },
  '上海市/上海市/浦东新区': { latitude: 31.2215, longitude: 121.5447 },
  '上海市/上海市/徐汇区': { latitude: 31.1883, longitude: 121.4365 }
};

export function buildRentalLocationLabel(city: string, district: string, address?: string) {
  return address?.trim() ? `${city} / ${district} / ${address.trim()}` : `${city} / ${district}`;
}

export function resolveRegionCenter(query: Pick<ListRentalsQuery, 'province' | 'city' | 'district'>) {
  const districtKey = `${query.province}/${query.city}/${query.district}`;
  const cityKey = `${query.province}/${query.city}`;
  return REGION_CENTERS[districtKey] ?? REGION_CENTERS[cityKey] ?? null;
}
```

```ts
// apps/backend/src/app/api/rentals/route.ts
const query: ListRentalsQuery = {
  keyword: searchParams.get('keyword') ?? undefined,
  filter: searchParams.get('filter') ?? undefined,
  sort: searchParams.get('sort') ?? undefined,
  page: searchParams.get('page') ?? undefined,
  pageSize: searchParams.get('pageSize') ?? undefined,
  priceRange: (searchParams.get('priceRange') as ListRentalsQuery['priceRange']) ?? undefined,
  province: searchParams.get('province') ?? undefined,
  city: searchParams.get('city') ?? undefined,
  district: searchParams.get('district') ?? undefined
};

if (!body.province || !body.city || !body.district) {
  return fail(BizCode.INVALID_PARAMS, '请选择省市区');
}
```

```ts
// apps/backend/src/modules/rentals/rental.repository.ts
interface RentalRow extends RowDataPacket {
  id: string;
  price: string;
  location: string;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  room_type: string;
  area: string;
  tags: string;
  photos: string;
  status: number;
}

if (query.province) {
  conditions.push('province = ?');
  params.push(query.province);
}
if (query.city) {
  conditions.push('city = ?');
  params.push(query.city);
}
if (query.district) {
  conditions.push('district = ?');
  params.push(query.district);
}

const center = resolveRegionCenter(query);
if (sort === 'distance' && center) {
  orderBy = `POW(latitude - ${center.latitude}, 2) + POW(longitude - ${center.longitude}, 2) ASC, created_at DESC`;
}
```

- [ ] **Step 4: Verify backend typecheck and rentals route compile cleanly**

Run: `pnpm --filter @rental-penpal/backend typecheck`

Expected: PASS

Run: `pnpm --filter @rental-penpal/backend lint`

Expected: PASS

- [ ] **Step 5: Commit the backend location support**

```bash
git add apps/backend/src/app/api/rentals/route.ts apps/backend/src/modules/rentals/rental.service.ts apps/backend/src/modules/rentals/rental.repository.ts apps/backend/src/modules/rentals/location-utils.ts apps/backend/src/modules/rentals/location-utils.test.ts
git commit -m "feat(backend): support structured rental locations"
```

## Task 3: Share Page Structured Region Input And Optional Precise Address

**Files:**
- Create: `apps/frontend/src/shared/location/region-options.ts`
- Create: `apps/frontend/src/shared/location/wechat-location.ts`
- Create: `apps/frontend/src/pages/share/components/RegionField/index.tsx`
- Create: `apps/frontend/src/pages/share/components/RegionField/index.scss`
- Create: `apps/frontend/src/pages/share/components/AddressActions/index.tsx`
- Create: `apps/frontend/src/pages/share/components/AddressActions/index.scss`
- Modify: `apps/frontend/src/pages/share/index.tsx`
- Modify: `apps/frontend/src/pages/share/index.scss`
- Modify: `apps/frontend/src/shared/api/services.ts`
- Test: `apps/frontend/src/shared/location/location-utils.test.ts`

- [ ] **Step 1: Extend the frontend helper test with the submit payload shape**

```ts
it('keeps precise coordinates only when region is unchanged', () => {
  const previous = { province: '上海市', city: '上海市', district: '浦东新区' };
  const next = { province: '上海市', city: '上海市', district: '浦东新区' };

  expect(shouldClearPreciseLocation(next, previous)).toBe(false);
});
```

- [ ] **Step 2: Run the targeted test before touching the share page**

Run: `pnpm --filter @rental-penpal/frontend test -- src/shared/location/location-utils.test.ts`

Expected: PASS before UI changes, so the helper stays stable while page code is refactored.

- [ ] **Step 3: Replace the free-text location field with region + optional precise address controls**

```tsx
// apps/frontend/src/pages/share/index.tsx
const [region, setRegion] = useState<RentalRegionInput | null>(null);
const [address, setAddress] = useState('');
const [coordinate, setCoordinate] = useState<RentalCoordinate | null>(null);

function handleRegionChange(nextRegion: RentalRegionInput) {
  setRegion((prev) => {
    const needsReset = shouldClearPreciseLocation(nextRegion, prev);
    if (needsReset) {
      setAddress('');
      setCoordinate(null);
    }
    return nextRegion;
  });
}

async function handleChooseLocation() {
  const result = await chooseWechatLocation();
  setAddress(result.address);
  setCoordinate({ latitude: result.latitude, longitude: result.longitude });
}

await createRental({
  price,
  location: buildDisplayLocation(region, address),
  province: region.province,
  city: region.city,
  district: region.district,
  address: address || undefined,
  latitude: coordinate?.latitude,
  longitude: coordinate?.longitude,
  roomType: ROOM_TYPES[roomTypeIndex],
  area: area || undefined,
  experience,
  tags: selectedTags,
  wechat: wechat || undefined,
  photos
});
```

```tsx
// apps/frontend/src/pages/share/components/RegionField/index.tsx
interface Props {
  value: RentalRegionInput | null;
  onChange: (value: RentalRegionInput) => void;
}

export function RegionField({ value, onChange }: Props) {
  return (
    <Picker mode="multiSelector" range={REGION_COLUMNS} onChange={handlePickerChange}>
      <View className="region-field">
        <Text className={`region-field__value${value ? '' : ' region-field__value--placeholder'}`}>
          {value ? `${value.province} / ${value.city} / ${value.district}` : '请选择省 / 市 / 区'}
        </Text>
      </View>
    </Picker>
  );
}
```

```tsx
// apps/frontend/src/pages/share/components/AddressActions/index.tsx
interface Props {
  address: string;
  onChooseLocation: () => void | Promise<void>;
  onSearchAddress: () => void | Promise<void>;
}

export function AddressActions({ address, onChooseLocation, onSearchAddress }: Props) {
  return (
    <View className="address-actions">
      <View className="address-actions__buttons">
        <View className="address-actions__button" onClick={onChooseLocation}>地图选位置</View>
        <View className="address-actions__button address-actions__button--secondary" onClick={onSearchAddress}>
          搜索地址
        </View>
      </View>
      <Text className={`address-actions__value${address ? '' : ' address-actions__value--placeholder'}`}>
        {address || '未选择详细地址'}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Run frontend checks for the share page refactor**

Run: `pnpm --filter @rental-penpal/frontend lint`

Expected: PASS

Run: `pnpm --filter @rental-penpal/frontend typecheck`

Expected: PASS

- [ ] **Step 5: Commit the share-page location authoring flow**

```bash
git add apps/frontend/src/shared/location/region-options.ts apps/frontend/src/shared/location/wechat-location.ts apps/frontend/src/pages/share/components/RegionField/index.tsx apps/frontend/src/pages/share/components/RegionField/index.scss apps/frontend/src/pages/share/components/AddressActions/index.tsx apps/frontend/src/pages/share/components/AddressActions/index.scss apps/frontend/src/pages/share/index.tsx apps/frontend/src/pages/share/index.scss apps/frontend/src/shared/api/services.ts
git commit -m "feat(frontend): add structured share page location input"
```

## Task 4: Find Page Region Filter And Region-Center Distance Sorting

**Files:**
- Create: `apps/frontend/src/pages/find/components/RegionFilter/index.tsx`
- Create: `apps/frontend/src/pages/find/components/RegionFilter/index.scss`
- Modify: `apps/frontend/src/pages/find/index.tsx`
- Modify: `apps/frontend/src/pages/find/index.scss`
- Modify: `apps/frontend/src/pages/find/components/SortBar/index.tsx`
- Modify: `apps/frontend/src/pages/find/components/FilterChips/index.tsx`
- Modify: `apps/frontend/src/shared/api/services.ts`
- Test: `apps/frontend/src/shared/location/location-utils.test.ts`

- [ ] **Step 1: Add a failing test for region-summary rendering logic**

```ts
import { describe, expect, it } from 'vitest';

import { formatRegionSummary } from './location-utils';

describe('formatRegionSummary', () => {
  it('renders empty state and selected region text', () => {
    expect(formatRegionSummary(null)).toBe('不限区域');
    expect(
      formatRegionSummary({ province: '上海市', city: '上海市', district: '浦东新区' })
    ).toBe('上海市 / 浦东新区');
  });
});
```

- [ ] **Step 2: Run the focused test to confirm the new formatter is missing**

Run: `pnpm --filter @rental-penpal/frontend test -- src/shared/location/location-utils.test.ts`

Expected: FAIL because `formatRegionSummary` is not exported yet.

- [ ] **Step 3: Wire region state into the find page and add the new sort option**

```tsx
// apps/frontend/src/pages/find/index.tsx
const [region, setRegion] = useState<RentalRegionInput | null>(null);

const query: ListRentalsQuery = {
  keyword: debouncedKeyword || undefined,
  filter: filter === 'all' ? undefined : filter,
  sort: sort === 'default' ? undefined : sort,
  page: String(pageNum),
  pageSize: String(PAGE_SIZE),
  priceRange,
  province: region?.province,
  city: region?.city,
  district: region?.district
};

function handleReset() {
  setKeyword('');
  setFilter('all');
  setPriceRange(undefined);
  setSort('default');
  setRegion(null);
}
```

```tsx
// apps/frontend/src/pages/find/components/SortBar/index.tsx
export type SortValue = 'default' | 'price_asc' | 'price_desc' | 'newest' | 'distance';

const OPTIONS: SortOption[] = [
  { label: '综合排序', value: 'default' },
  { label: '价格', value: 'price_asc', altValue: 'price_desc' },
  { label: '距离所选区域', value: 'distance' },
  { label: '最新发布', value: 'newest' }
];
```

```tsx
// apps/frontend/src/pages/find/components/RegionFilter/index.tsx
interface Props {
  value: RentalRegionInput | null;
  onChange: (value: RentalRegionInput | null) => void;
}

export function RegionFilter({ value, onChange }: Props) {
  return (
    <View className="region-filter">
      <Text className="region-filter__label">区域</Text>
      <View className="region-filter__trigger" onClick={handleOpenPicker}>
        <Text className={`region-filter__value${value ? '' : ' region-filter__value--placeholder'}`}>
          {formatRegionSummary(value)}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run frontend lint, typecheck, and build for the find page changes**

Run: `pnpm --filter @rental-penpal/frontend lint`

Expected: PASS

Run: `pnpm --filter @rental-penpal/frontend typecheck`

Expected: PASS

Run: `pnpm build:frontend`

Expected: PASS and no new Taro compile errors in `find` or `share`.

- [ ] **Step 5: Commit the find-page region filtering work**

```bash
git add apps/frontend/src/pages/find/components/RegionFilter/index.tsx apps/frontend/src/pages/find/components/RegionFilter/index.scss apps/frontend/src/pages/find/index.tsx apps/frontend/src/pages/find/index.scss apps/frontend/src/pages/find/components/SortBar/index.tsx apps/frontend/src/pages/find/components/FilterChips/index.tsx apps/frontend/src/shared/api/services.ts apps/frontend/src/shared/location/location-utils.ts apps/frontend/src/shared/location/location-utils.test.ts
git commit -m "feat(frontend): filter rentals by region and distance"
```

## Task 5: End-To-End Verification And Regression Pass

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-map-assisted-location-design.md` only if implementation forces an approved design clarification
- Test: `apps/frontend/src/shared/location/location-utils.test.ts`

- [ ] **Step 1: Run the full frontend test file and workspace typecheck**

Run: `pnpm --filter @rental-penpal/frontend test`

Expected: PASS, including the new location helper coverage and existing auth-store tests.

Run: `pnpm typecheck`

Expected: PASS

- [ ] **Step 2: Run the lint / build sweep that mirrors release confidence**

Run: `pnpm lint`

Expected: PASS

Run: `pnpm build:frontend`

Expected: PASS

Run: `pnpm build:backend`

Expected: PASS

- [ ] **Step 3: Manual verification in the mini-program**

```text
1. Open the share page and verify publish is blocked until province/city/district are selected.
2. Select 上海市 / 上海市 / 浦东新区 and publish without detailed address; confirm the new listing shows "上海市 / 浦东新区".
3. Re-open the share page, choose 地图选位置, confirm address preview is filled, and publish; confirm detail page still renders the combined location string.
4. Change the district after choosing a precise address and verify the precise address preview is cleared.
5. Open the find page, select the same district in the region filter, and confirm the request includes `province`, `city`, and `district`.
6. Switch sort to `距离所选区域` and verify the label never says `离我最近`.
7. Clear the region filter and confirm list results return to the default sort flow.
```

- [ ] **Step 4: Commit the verification checkpoint or any required follow-up fixes**

```bash
git add .
git commit -m "test: verify map assisted rental location flow"
```

## Self-Review

### Spec coverage

- Share page required province/city/district: covered by Task 3.
- Optional detailed address and coordinates from map/search: covered by Task 3.
- Keep legacy display `location`: covered by Tasks 1 and 2.
- Find page region filter without a map page: covered by Task 4.
- Distance sorting by selected region center, not current user position: covered by Tasks 2 and 4.
- District-change clears stale precise address: covered by Tasks 1 and 3.
- Failure / fallback behavior for missing region center: covered by Task 2 and manual verification in Task 5.

### Placeholder scan

- No `TODO`, `TBD`, or “handle appropriately” placeholders remain.
- Each task includes concrete files, commands, and code anchors.

### Type consistency

- Shared type names are fixed as `RentalRegionInput`, `RentalCoordinate`, and `RentalStructuredLocation`.
- Query field names stay `province`, `city`, `district` across frontend services, route parsing, and repository filtering.
- Sort value for region-center ordering is fixed as `distance`.
