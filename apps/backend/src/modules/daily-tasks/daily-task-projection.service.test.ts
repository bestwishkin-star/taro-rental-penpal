import type { PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getOwnedRentalState,
  insertSpaceFactValue,
  listOwnerSpaceFactHeads,
  upsertSpaceFactHead
} from './daily-task.repository';
import {
  mapObservationToFacts,
  projectObservation,
  readOwnerSpaceFacts
} from './daily-task-projection.service';
import { DAILY_TASK_TEMPLATES } from './daily-task.templates';
import type { RentalTaskObservation } from './daily-task.types';

vi.mock('./daily-task.repository', () => ({
  getOwnedRentalState: vi.fn().mockResolvedValue('PUBLISHED'),
  insertSpaceFactValue: vi.fn(),
  listOwnerSpaceFactHeads: vi.fn(),
  upsertSpaceFactHead: vi.fn()
}));
vi.mock('./daily-task-schema', () => ({ ensureDailyTaskSchema: vi.fn() }));

/** 投影测试使用的卧室夜间噪声模板。 */
const template = DAILY_TASK_TEMPLATES.find((item) => item.id === 'bedroom-night-noise')!;

/** 构造可按用例覆盖的不可变观察记录。 */
function createObservation(
  overrides: Partial<RentalTaskObservation> = {}
): RentalTaskObservation {
  return {
    id: 'observation-1',
    taskId: 'task-1',
    rentalId: 'rental-1',
    ownerOpenid: 'owner-1',
    module: 'bedroom',
    taskDate: '2026-08-10',
    idempotencyKey: 'idempotency-1',
    answers: { sleep_noise: 'slight' },
    measurementValues: {},
    photoAssetIds: [],
    conclusionVisibility: 'PRIVATE',
    photoVisibility: 'PRIVATE',
    integrityStatus: 'PASSED',
    safetyStatus: 'UNCHECKED',
    householdStatus: 'UNCHECKED',
    publicProjectionStatus: 'NOT_REQUESTED',
    observedAt: '2026-08-10T08:00:00.000Z',
    ...overrides
  };
}

describe('daily-task-projection.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOwnedRentalState).mockResolvedValue('PUBLISHED');
    vi.mocked(insertSpaceFactValue).mockResolvedValue('fact-value-1');
    vi.mocked(upsertSpaceFactHead).mockResolvedValue(undefined);
    vi.mocked(listOwnerSpaceFactHeads).mockResolvedValue([]);
  });

  it('私密观察只推进 owner head', async () => {
    const result = await projectObservation(
      createObservation(),
      template,
      {} as PoolConnection
    );

    expect(result.ownerFactKeys).toEqual(['bedroom.night-noise']);
    expect(result.publicFactKeys).toEqual([]);
    expect(result.publicProjectionStatus).toBe('NOT_REQUESTED');
    expect(upsertSpaceFactHead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ownerFactValueId: 'fact-value-1',
        publicFactValueId: undefined
      })
    );
  });

  it('需要照片佐证的公开事实审核中时不推进 public head', async () => {
    const photoTemplate = DAILY_TASK_TEMPLATES.find(
      (item) => item.id === 'bedroom-window-photo'
    )!;
    const result = await projectObservation(
      createObservation({
        answers: { window_light: 'enough' },
        conclusionVisibility: 'PUBLIC',
        photoAssetIds: ['photo-1'],
        safetyStatus: 'PENDING',
        householdStatus: 'PENDING',
        publicProjectionStatus: 'PENDING'
      }),
      photoTemplate,
      {} as PoolConnection
    );

    expect(result.publicProjectionStatus).toBe('PENDING');
    expect(result.publicFactKeys).toEqual([]);
  });

  it('公开且审核通过的观察同时推进 owner 与 public head', async () => {
    const result = await projectObservation(
      createObservation({ conclusionVisibility: 'PUBLIC' }),
      template,
      {} as PoolConnection
    );

    expect(result.publicProjectionStatus).toBe('PUBLISHED');
    expect(result.publicFactKeys).toEqual(['bedroom.night-noise']);
    expect(upsertSpaceFactHead).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ publicFactValueId: 'fact-value-1' })
    );
  });

  it('只映射模板白名单中声明的答案', () => {
    const facts = mapObservationToFacts(
      createObservation({ answers: { sleep_noise: 'none', injected_fact: 'fake' } }),
      template
    );

    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({ key: 'bedroom.night-noise', value: 'none' });
  });

  it('房主事实接口始终返回六个空间并计算新鲜度', async () => {
    vi.mocked(listOwnerSpaceFactHeads).mockResolvedValue([
      {
        module: 'bedroom',
        key: 'bedroom.night-noise',
        label: '卧室入睡噪声',
        value: 'slight',
        observedAt: '2026-08-10T08:00:00.000Z'
      }
    ]);

    const result = await readOwnerSpaceFacts(
      'owner-1',
      'rental-1',
      new Date('2026-08-10T12:00:00.000Z')
    );

    expect(result).toHaveLength(6);
    expect(result.find((item) => item.module === 'bedroom')).toMatchObject({
      freshnessPercent: 100,
      facts: [expect.objectContaining({ key: 'bedroom.night-noise' })]
    });
  });
});
