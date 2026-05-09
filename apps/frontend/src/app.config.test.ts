import { describe, expect, it, vi } from 'vitest';

describe('app location privacy config', () => {
  it('does not declare WeChat private location APIs', async () => {
    vi.stubGlobal('defineAppConfig', (config: unknown) => config);

    const config = (await import('./app.config')).default as {
      requiredPrivateInfos?: string[];
      permission?: Record<string, { desc?: string }>;
    };

    expect(config.requiredPrivateInfos ?? []).not.toContain('getLocation');
    expect(config.requiredPrivateInfos ?? []).not.toContain('chooseLocation');
    expect(config.permission?.['scope.userLocation']).toBeUndefined();
  });
});
