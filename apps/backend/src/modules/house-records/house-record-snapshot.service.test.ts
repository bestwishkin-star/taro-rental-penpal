import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publishCurrentHouseRecord } from './house-record-snapshot.service';
import { getOwnedSnapshotDraft, replaceSnapshotFromDraft } from './house-record-snapshot.repository';

vi.mock('./house-record-snapshot.repository', () => ({
  getOwnedSnapshotDraft: vi.fn(),
  replaceSnapshotFromDraft: vi.fn()
}));

describe('publishCurrentHouseRecord', () => {
  beforeEach(() => vi.clearAllMocks());

  it('使用上海自然日覆盖房主当天快照', async () => {
    vi.mocked(getOwnedSnapshotDraft).mockResolvedValue({
      draftId: 'draft-1',
      updatedAt: '2026-08-06T01:00:00.000Z'
    });
    vi.mocked(replaceSnapshotFromDraft).mockResolvedValue({
      status: 'WRITTEN',
      snapshotId: 'snapshot-1',
      snapshotDate: '2026-08-06'
    });

    await expect(
      publishCurrentHouseRecord('owner-1', 'rental-1', new Date('2026-08-05T16:30:00.000Z'))
    ).resolves.toEqual({ snapshotDate: '2026-08-06' });
    expect(replaceSnapshotFromDraft).toHaveBeenCalledWith({
      draftId: 'draft-1',
      rentalId: 'rental-1',
      ownerOpenid: 'owner-1',
      snapshotDate: '2026-08-06',
      source: 'MANUAL_UPDATE'
    });
  });

  it('拒绝更新不属于当前用户的公开房屋', async () => {
    vi.mocked(getOwnedSnapshotDraft).mockResolvedValue(null);
    await expect(publishCurrentHouseRecord('owner-1', 'rental-2')).rejects.toMatchObject({
      bizCode: 1301
    });
  });

  it('拒绝发布六空间不完整的当前态', async () => {
    vi.mocked(getOwnedSnapshotDraft).mockResolvedValue({
      draftId: 'draft-1',
      updatedAt: '2026-08-06T01:00:00.000Z'
    });
    vi.mocked(replaceSnapshotFromDraft).mockResolvedValue({ status: 'INCOMPLETE' });
    await expect(publishCurrentHouseRecord('owner-1', 'rental-1')).rejects.toMatchObject({
      bizCode: 1001
    });
  });
});
