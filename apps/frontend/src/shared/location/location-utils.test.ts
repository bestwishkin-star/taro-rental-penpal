import type { RentalRegionInput } from '@shared/contracts/location';
import { describe, expect, it } from 'vitest';

import { buildDisplayLocation, formatRegionSummary, shouldClearPreciseLocation } from './location-utils';

describe('location utils', () => {
  it('builds display text from region and optional address', () => {
    const region: RentalRegionInput = {
      province: 'Shanghai',
      city: 'Shanghai',
      district: 'Pudong'
    };

    expect(buildDisplayLocation(region, '')).toBe('Shanghai / Pudong');
    expect(buildDisplayLocation(region, 'Zhangjiang')).toBe('Shanghai / Pudong / Zhangjiang');
  });

  it('clears precise location when district changes', () => {
    expect(
      shouldClearPreciseLocation(
        { province: 'Shanghai', city: 'Shanghai', district: 'Xuhui' },
        { province: 'Shanghai', city: 'Shanghai', district: 'Pudong' }
      )
    ).toBe(true);
  });

  it('keeps precise location when region is unchanged', () => {
    expect(
      shouldClearPreciseLocation(
        { province: 'Shanghai', city: 'Shanghai', district: 'Pudong' },
        { province: 'Shanghai', city: 'Shanghai', district: 'Pudong' }
      )
    ).toBe(false);
  });

  it('formats the find page region summary', () => {
    expect(formatRegionSummary(null)).toBe('All regions');
    expect(
      formatRegionSummary({
        province: 'Shanghai',
        city: 'Shanghai',
        district: 'Pudong'
      })
    ).toBe('Shanghai / Pudong');
  });
});
