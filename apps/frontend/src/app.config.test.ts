import { describe, expect, it, vi } from 'vitest';

describe('app location privacy config', () => {
  it('declares the WeChat private API required by map location selection', async () => {
    vi.stubGlobal('defineAppConfig', (config: unknown) => config);

    const config = (await import('./app.config')).default as {
      requiredPrivateInfos?: string[];
      permission?: Record<string, { desc?: string }>;
    };

    expect(config.requiredPrivateInfos).toEqual(expect.arrayContaining(['chooseLocation']));
    expect(config.permission?.['scope.userLocation']?.desc).toContain('位置');
  });
});
