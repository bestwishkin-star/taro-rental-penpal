import type {
  HouseRecordActivityState,
  HouseRecordListing,
  HouseRecordSnapshotResponse,
  HouseRecordSnapshotStatus,
  HouseRecordTimelineResponse
} from '@shared/contracts/house-record';
import type { ListRentalsQuery } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { AppError } from '@/lib/errors';

import {
  isHouseRecordOwner,
  listTimelineActivities,
  type HouseRecordTimelineActivity
} from './house-record-activity.repository';
import { getShanghaiDate, getTimelineDates, getTimelineRange } from './house-record-date';
import { publishCurrentHouseRecord } from './house-record-snapshot.service';
import {
  countRecentSnapshots,
  getBatchTrustLabels,
  getOwnerHouseRecordState,
  getOwnerSnapshotStatus,
  getPublicHouseRecordSummary,
  getPublicSnapshotHeader,
  getRentalTrustEvidence,
  listLatestPublicSnapshots,
  listSnapshotPhotos,
  listSnapshotSpaces,
  listTimelineModules,
  listTimelineSnapshots
} from './house-record.repository';

/** 发现列表单页最大数量，避免公开接口被超大分页拖垮。 */
const MAX_PAGE_SIZE = 50;

/** 同一自然日活动合并后的隐私安全摘要。 */
interface TimelineActivitySummary {
  state: HouseRecordActivityState;
  publicModules: NonNullable<HouseRecordTimelineActivity['module']>[];
  hasPrivateActivity: boolean;
}

/** 将字符串分页参数限制为正整数。 */
function positiveInteger(value: string | undefined, fallback: number, maximum?: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  const normalized = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return maximum ? Math.min(normalized, maximum) : normalized;
}

/** 按查看者身份合并同日活动状态，拒绝原因仅对房主可见。 */
function summarizeTimelineActivities(
  activities: HouseRecordTimelineActivity[],
  isOwner: boolean
): TimelineActivitySummary {
  const hasPending = activities.some((item) => item.projectionStatus === 'PENDING');
  const hasRejected = activities.some((item) => item.projectionStatus === 'REJECTED');
  const publicModules = activities.flatMap((item) =>
    item.visibility === 'PUBLIC' &&
    item.projectionStatus === 'PUBLISHED' &&
    item.module
      ? [item.module]
      : []
  );
  const hasPrivateActivity = activities.some(
    (item) =>
      item.visibility === 'PRIVATE' ||
      item.projectionStatus === 'NOT_REQUESTED' ||
      item.projectionStatus === 'REJECTED'
  );

  let state: HouseRecordActivityState = 'PRIVATE_ACTIVITY';
  if (hasRejected && isOwner) state = 'REVIEW_REJECTED_OWNER_ONLY';
  else if (hasPending) state = 'REVIEW_PENDING';
  else if (publicModules.length > 0) state = 'PUBLIC_UPDATE';
  return {
    state,
    publicModules: [...new Set(publicModules)],
    hasPrivateActivity
  };
}

/** 读取房屋实录发现列表，并批量补齐更新次数和可信标签。 */
export async function readHouseRecords(
  query: ListRentalsQuery,
  now = new Date()
): Promise<HouseRecordListing[]> {
  const page = positiveInteger(query.page, 1);
  const pageSize = positiveInteger(query.pageSize, 10, MAX_PAGE_SIZE);
  const rows = await listLatestPublicSnapshots({ keyword: query.keyword, page, pageSize });
  const rentalIds = rows.map((row) => row.rentalId);
  const range = getTimelineRange(getShanghaiDate(now));
  const [counts, labels] = await Promise.all([
    countRecentSnapshots(rentalIds, range),
    getBatchTrustLabels(rentalIds)
  ]);
  return rows.map((row) => ({
    rentalId: row.rentalId,
    title: row.title,
    contentPreview: row.contentPreview,
    coverPhoto: row.coverPhoto,
    author: { nickname: row.nickname, avatar: row.avatar },
    trustLabels: labels.get(row.rentalId) ?? [],
    recentUpdateCount: counts.get(row.rentalId) ?? 0,
    latestSnapshotDate: row.latestSnapshotDate,
    updatedAt: row.updatedAt
  }));
}

/** 返回今天及最近 14 个有记录的历史日期，稀疏记录不受自然日窗口限制。 */
export async function readHouseRecordTimeline(
  rentalId: string,
  now = new Date(),
  viewerOpenid?: string
): Promise<HouseRecordTimelineResponse> {
  const today = getShanghaiDate(now);
  const summary = await getPublicHouseRecordSummary(rentalId);
  if (!summary) throw new AppError(BizCode.RENTAL_NOT_FOUND);

  const recentSnapshots = await listTimelineSnapshots(rentalId, today);
  const dates = getTimelineDates(today, recentSnapshots.map((snapshot) => snapshot.snapshotDate));
  const snapshots = recentSnapshots.filter((snapshot) => dates.includes(snapshot.snapshotDate));
  const range = { start: dates[dates.length - 1], end: today };
  const [modules, labels, activities, isOwner] = await Promise.all([
    listTimelineModules(snapshots.map((snapshot) => snapshot.snapshotId)),
    getBatchTrustLabels([rentalId]),
    listTimelineActivities(rentalId, range),
    isHouseRecordOwner(rentalId, viewerOpenid)
  ]);
  const activitiesByDate = new Map<string, HouseRecordTimelineActivity[]>();
  for (const activity of activities) {
    const current = activitiesByDate.get(activity.snapshotDate) ?? [];
    current.push(activity);
    activitiesByDate.set(activity.snapshotDate, current);
  }
  const snapshotsByDate = new Map(snapshots.map((snapshot) => [snapshot.snapshotDate, snapshot]));
  return {
    rentalId,
    title: summary.title,
    author: { nickname: summary.nickname, avatar: summary.avatar },
    trustLabels: labels.get(rentalId) ?? [],
    isOwner,
    rangeStart: range.start,
    rangeEnd: range.end,
    nodes: dates.map((snapshotDate) => {
      const snapshot = snapshotsByDate.get(snapshotDate);
      const isToday = snapshotDate === range.end;
      if (!snapshot) {
        return {
          snapshotDate,
          hasRecord: false,
          isToday,
          activityState: 'NOT_REPORTED',
          updatedModules: [],
          hasPrivateActivity: false,
          isLatest: false
        };
      }
      const dailyActivities = activitiesByDate.get(snapshot.snapshotDate);
      const activity = dailyActivities
        ? summarizeTimelineActivities(dailyActivities, isOwner)
        : null;
      const activityState = activity?.state ?? 'PUBLIC_UPDATE';
      const canShowPublicMedia = activityState === 'PUBLIC_UPDATE';
      return {
        snapshotDate: snapshot.snapshotDate,
        source: snapshot.source,
        hasRecord: true,
        isToday,
        activityState,
        updatedModules: activity
          ? activity.publicModules
          : modules.get(snapshot.snapshotId) ?? [],
        hasPrivateActivity: activity?.hasPrivateActivity ?? false,
        ...(canShowPublicMedia
          ? { contentPreview: snapshot.contentPreview, coverPhoto: snapshot.coverPhoto }
          : {}),
        isLatest: snapshot.snapshotDate === dates.find((date) => snapshotsByDate.has(date))
      };
    })
  };
}

/** 读取指定日期的不可变公开快照，正文和照片均不回查当前草稿。 */
export async function readHouseRecordSnapshot(
  rentalId: string,
  snapshotDate: string
): Promise<HouseRecordSnapshotResponse> {
  const header = await getPublicSnapshotHeader(rentalId, snapshotDate);
  if (!header) throw new AppError(BizCode.SNAPSHOT_NOT_FOUND);

  const spaces = await listSnapshotSpaces(header.snapshotId);
  const [photos, trustEvidence] = await Promise.all([
    listSnapshotPhotos(spaces.map((space) => space.snapshotSpaceId)),
    getRentalTrustEvidence(rentalId)
  ]);
  return {
    rentalId: header.rentalId,
    snapshotDate: header.snapshotDate,
    source: header.source,
    records: spaces.map((space) => ({
      module: space.module,
      publicPhotos: photos.get(space.snapshotSpaceId) ?? [],
      sceneAnswers: space.sceneAnswers,
      observations: space.observations,
      eventText: space.eventText,
      eventVoiceUrl: space.eventVoiceUrl,
      eventOccurredPeriod: space.eventOccurredPeriod
    })),
    trustEvidence
  };
}

/** 读取房主当前态是否晚于最后公开快照。 */
export async function readHouseRecordSnapshotStatus(
  userOpenid: string,
  rentalId: string
): Promise<HouseRecordSnapshotStatus> {
  const state = await getOwnerHouseRecordState(userOpenid, rentalId);
  if (!state) throw new AppError(BizCode.RENTAL_PERMISSION_DENIED);
  if (!state.isPublished) throw new AppError(BizCode.RENTAL_NOT_PUBLISHED);

  const status = await getOwnerSnapshotStatus(userOpenid, rentalId);
  if (!status) throw new AppError(BizCode.RENTAL_NOT_FOUND);
  return {
    currentUpdatedAt: status.currentUpdatedAt,
    latestSnapshotDate: status.latestSnapshotDate,
    hasUnpublishedChanges:
      !status.latestSnapshotUpdatedAt ||
      new Date(status.currentUpdatedAt).getTime() >
        new Date(status.latestSnapshotUpdatedAt).getTime()
  };
}

/** 校验所有权和公开状态后生成或覆盖房主当天快照。 */
export async function updateOwnedHouseRecord(userOpenid: string, rentalId: string) {
  const state = await getOwnerHouseRecordState(userOpenid, rentalId);
  if (!state) throw new AppError(BizCode.RENTAL_PERMISSION_DENIED);
  if (!state.isPublished) throw new AppError(BizCode.RENTAL_NOT_PUBLISHED);
  return publishCurrentHouseRecord(userOpenid, rentalId);
}
