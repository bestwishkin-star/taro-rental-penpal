import type { PoolConnection } from 'mysql2/promise';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { replaceSnapshotFromDraftWithConnection } from '@/modules/house-records/house-record-snapshot.repository';

import { listPublicSpaceFactHeadsWithConnection } from './daily-task.repository';
import { replaceSnapshotFromPublicFactsWithConnection } from './daily-task-snapshot.service';

vi.mock('@/modules/house-records/house-record-snapshot.repository', () => ({
  replaceSnapshotFromDraftWithConnection: vi.fn()
}));

vi.mock('./daily-task.repository', () => ({
  listPublicSpaceFactHeadsWithConnection: vi.fn()
}));

/** 创建可按调用顺序返回数据库行的事务连接替身。 */
function createConnection(...rowSets: unknown[][]) {
  const execute = vi.fn();
  for (const rows of rowSets) execute.mockResolvedValueOnce([rows]);
  return { execute } as unknown as PoolConnection;
}

/** 随机任务快照测试复用的输入。 */
const input = {
  rentalId: 'rental-1',
  ownerOpenid: 'owner-1',
  snapshotDate: '2026-08-10',
  source: 'RANDOM_TASK' as const
};

describe('daily-task-snapshot.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(replaceSnapshotFromDraftWithConnection).mockResolvedValue({
      status: 'WRITTEN',
      snapshotId: 'snapshot-1',
      snapshotDate: '2026-08-10'
    });
    vi.mocked(listPublicSpaceFactHeadsWithConnection).mockResolvedValue([]);
  });

  it('私密观察仍创建当日公开基线但不覆盖任何公开字段', async () => {
    const connection = createConnection([{ id: 'draft-1' }]);

    await expect(
      replaceSnapshotFromPublicFactsWithConnection(connection, input)
    ).resolves.toEqual({ snapshotId: 'snapshot-1' });
    expect(replaceSnapshotFromDraftWithConnection).toHaveBeenCalledOnce();
    expect(connection.execute).toHaveBeenCalledOnce();
  });

  it('使用 public heads 覆盖对应空间的公开观察', async () => {
    vi.mocked(listPublicSpaceFactHeadsWithConnection).mockResolvedValue([
      {
        module: 'bedroom',
        key: 'bedroom.night-noise',
        label: '卧室入睡噪声',
        value: 'slight',
        observedAt: '2026-08-10T08:00:00.000Z'
      }
    ]);
    const connection = createConnection(
      [{ id: 'draft-1' }],
      [
        {
          id: 'space-1',
          module_type: 'bedroom',
          observations: JSON.stringify([{ label: '原有观察', value: '安静' }])
        }
      ],
      []
    );

    await replaceSnapshotFromPublicFactsWithConnection(connection, input);

    expect(connection.execute).toHaveBeenLastCalledWith(
      'UPDATE rental_public_snapshot_spaces SET observations = ? WHERE id = ?',
      [
        JSON.stringify([
          { label: '原有观察', value: '安静' },
          { label: '卧室入睡噪声', value: 'slight' }
        ]),
        'space-1'
      ]
    );
  });
});
