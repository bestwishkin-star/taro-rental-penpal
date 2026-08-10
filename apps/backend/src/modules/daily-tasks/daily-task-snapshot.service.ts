import type { DailyTaskAnswerValue } from '@shared/contracts/daily-task';
import type { HouseModuleId } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

import { AppError } from '@/lib/errors';
import { replaceSnapshotFromDraftWithConnection } from '@/modules/house-records/house-record-snapshot.repository';

import { listPublicSpaceFactHeadsWithConnection } from './daily-task.repository';

/** 随机任务重建公开快照所需参数。 */
export interface ReplaceSnapshotFromPublicFactsInput {
  rentalId: string;
  ownerOpenid: string;
  snapshotDate: string;
  source: 'RANDOM_TASK';
}

/** 房主当前已发布草稿的数据库行。 */
interface PublishedDraftRow extends RowDataPacket {
  id: string;
}

/** 快照空间中允许覆盖公开观察的数据库行。 */
interface SnapshotSpaceProjectionRow extends RowDataPacket {
  id: string;
  module_type: HouseModuleId;
  observations: string | Array<{ label: string; value: string }> | null;
}

/** 安全解析快照已有观察，损坏数据降级为空数组。 */
function parseObservations(
  value: SnapshotSpaceProjectionRow['observations']
): Array<{ label: string; value: string }> {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is { label: string; value: string } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { value?: unknown }).value === 'string'
    );
  } catch {
    return [];
  }
}

/** 将归一化事实转换为公开快照使用的文本。 */
function formatFactValue(value: DailyTaskAnswerValue): string {
  return Array.isArray(value) ? value.join('、') : String(value);
}

/** 在调用方事务中以草稿为基线，并使用 public heads 重建当日公开快照。 */
export async function replaceSnapshotFromPublicFactsWithConnection(
  connection: PoolConnection,
  input: ReplaceSnapshotFromPublicFactsInput
): Promise<{ snapshotId: string }> {
  const [draftRows] = await connection.execute<PublishedDraftRow[]>(
    `SELECT id
     FROM rental_story_drafts
     WHERE user_openid = ?
       AND published_rental_id = ?
       AND status IN ('DRAFT', 'PUBLISHED')
     ORDER BY FIELD(status, 'DRAFT', 'PUBLISHED'), updated_at DESC
     LIMIT 1
     FOR UPDATE`,
    [input.ownerOpenid, input.rentalId]
  );
  const draftId = draftRows[0]?.id;
  if (!draftId) throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);

  // 先复用房屋实录完整六空间快照，再仅叠加通过公开规则的字段事实。
  const baseSnapshot = await replaceSnapshotFromDraftWithConnection(connection, {
    draftId,
    rentalId: input.rentalId,
    ownerOpenid: input.ownerOpenid,
    snapshotDate: input.snapshotDate,
    source: input.source
  });
  if (baseSnapshot.status !== 'WRITTEN') {
    throw new AppError(BizCode.TASK_COMPLETION_CONFLICT);
  }

  const publicFacts = await listPublicSpaceFactHeadsWithConnection(connection, input.rentalId);
  if (publicFacts.length === 0) return { snapshotId: baseSnapshot.snapshotId };

  const [spaceRows] = await connection.execute<SnapshotSpaceProjectionRow[]>(
    `SELECT id, module_type, observations
     FROM rental_public_snapshot_spaces
     WHERE snapshot_id = ?
     FOR UPDATE`,
    [baseSnapshot.snapshotId]
  );

  for (const space of spaceRows) {
    const facts = publicFacts.filter((fact) => fact.module === space.module_type);
    if (facts.length === 0) continue;

    const projectedLabels = new Set(facts.map((fact) => fact.label));
    const observations = parseObservations(space.observations).filter(
      (observation) => !projectedLabels.has(observation.label)
    );
    observations.push(
      ...facts.map((fact) => ({ label: fact.label, value: formatFactValue(fact.value) }))
    );
    await connection.execute(
      'UPDATE rental_public_snapshot_spaces SET observations = ? WHERE id = ?',
      [JSON.stringify(observations), space.id]
    );
  }

  return { snapshotId: baseSnapshot.snapshotId };
}
