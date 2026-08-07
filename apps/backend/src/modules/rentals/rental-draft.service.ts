import {
  HOUSE_MODULE_IDS,
  type AttachSpacePhotoInput,
  type EvidenceVisibility,
  type HouseModuleId,
  type PhotoCaptureChallenge,
  type RentalDraftModuleSummary,
  type RentalDraftSummary,
  type RentalSpaceRecord,
  type SpaceRecordResponse,
  type SpaceSceneAnswer,
  type UpdateSpacePhotoInput,
  type UpsertSpaceRecordInput
} from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { AppError } from '@/lib/errors';
import { getOwnedPhotoAsset } from '@/modules/photo-analysis/photo-asset.repository';
import { queueConfiguredPhotoAnalysis } from '@/modules/photo-analysis/photo-analysis.service';

import {
  attachRentalSpacePhoto,
  deleteRentalSpacePhoto,
  getCurrentRentalDraft,
  getOrCreateRentalDraft,
  getOwnedRentalDraft,
  getRentalSpaceRecord,
  listRentalDraftRecords,
  listRentalSpacePhotos,
  isPhotoContentUsedInDraft,
  parseSceneAnswers,
  publishRentalDraftTransaction,
  refreshRentalSpaceRecordCompletion,
  updateRentalSpacePhotoVisibility,
  upsertRentalSpaceRecord,
  type RentalDraftRecordRow,
  type RentalDraftRow
} from './rental-draft.repository';
import { consumeCaptureChallenge, createCaptureChallenge } from './rental-capture-challenge.repository';
import { getRandomCapturePrompt, getSpacePromptConfig } from './rental-space-prompts';

/** 根据服务端规则判断单个空间点位是否完整。 */
function isRecordComplete(record: RentalDraftRecordRow): boolean {
  const hasEvent = (record.event_text?.trim().length ?? 0) >= 20 || Boolean(record.event_voice_url?.trim());
  return (
    Number(record.photo_count) > 0 &&
    parseSceneAnswers(record.scene_answers).length >= 3 &&
    hasEvent &&
    Number(record.is_slice_confirmed) === 1
  );
}

/** 将数据库草稿聚合为三维房屋页面使用的完成度摘要。 */
function toSummary(draft: RentalDraftRow, records: RentalDraftRecordRow[]): RentalDraftSummary {
  const recordByModule = new Map<HouseModuleId, RentalDraftRecordRow>(
    records.map((record) => [record.module_type, record])
  );
  const modules: RentalDraftModuleSummary[] = HOUSE_MODULE_IDS.map((module) => {
    const record = recordByModule.get(module);
    return {
      module,
      isComplete: record ? isRecordComplete(record) : false,
      photoCount: record ? Number(record.photo_count) : 0,
      updatedAt: record ? new Date(record.updated_at).toISOString() : undefined
    };
  });
  const completedModules = modules.filter((module) => module.isComplete).map((module) => module.module);
  return {
    id: draft.id,
    status: draft.status,
    modules,
    completedModules,
    completion: Math.round((completedModules.length / HOUSE_MODULE_IDS.length) * 100),
    canPublish:
      completedModules.length === HOUSE_MODULE_IDS.length &&
      draft.status === 'DRAFT' &&
      !draft.published_rental_id,
    publishedRentalId: draft.published_rental_id ?? undefined,
    updatedAt: new Date(draft.updated_at).toISOString()
  };
}

/** 获取草稿最新记录后构建摘要。 */
async function buildDraftSummary(draft: RentalDraftRow): Promise<RentalDraftSummary> {
  return toSummary(draft, await listRentalDraftRecords(draft.id));
}

/** 校验草稿所有权及可编辑状态。 */
async function requireOwnedDraft(draftId: string, userOpenid: string): Promise<RentalDraftRow> {
  const draft = await getOwnedRentalDraft(draftId, userOpenid);
  if (!draft) throw new AppError(BizCode.NOT_FOUND, '记录草稿不存在');
  if (draft.status !== 'DRAFT') throw new AppError(BizCode.FORBIDDEN, '该记录已经发布，不能继续修改');
  return draft;
}

/** 过滤未知题目并按 promptId 去重，防止客户端注入任意结构。 */
function normalizeAnswers(answers: SpaceSceneAnswer[], module: HouseModuleId): SpaceSceneAnswer[] {
  const promptIds = new Set(getSpacePromptConfig(module).prompts.map((prompt) => prompt.id));
  const normalized = new Map<string, SpaceSceneAnswer>();
  for (const answer of answers) {
    if (!promptIds.has(answer.promptId)) continue;
    normalized.set(answer.promptId, answer);
  }
  return [...normalized.values()];
}

/** 将点位数据库行和照片资产映射为草稿所有者响应。 */
async function toSpaceRecord(
  module: HouseModuleId,
  record: RentalDraftRecordRow | null
): Promise<RentalSpaceRecord> {
  const photos = record ? await listRentalSpacePhotos(record.id) : [];
  return {
    id: record?.id,
    module,
    promptVersion: record?.prompt_version ?? getSpacePromptConfig(module).promptVersion,
    photos: photos.map((photo) => ({
      id: photo.id,
      assetId: photo.photo_asset_id,
      url: photo.file_url,
      visibility: photo.visibility,
      capturedAt: photo.captured_at ? new Date(photo.captured_at).toISOString() : undefined,
      safetyStatus: photo.safety_status,
      householdStatus: photo.household_status
    })),
    sceneAnswers: parseSceneAnswers(record?.scene_answers ?? null),
    eventText: record?.event_text ?? undefined,
    eventVoiceUrl: record?.event_voice_url ?? undefined,
    eventOccurredPeriod: record?.event_occurred_period ?? undefined,
    isSliceConfirmed: Number(record?.is_slice_confirmed ?? 0) === 1,
    isComplete: record ? isRecordComplete(record) : false,
    completedAt: record?.completed_at ? new Date(record.completed_at).toISOString() : undefined,
    updatedAt: record?.updated_at ? new Date(record.updated_at).toISOString() : undefined
  };
}

/** 聚合点位页一次渲染需要的草稿、题目和当前记录。 */
async function buildSpaceRecordResponse(
  draft: RentalDraftRow,
  module: HouseModuleId
): Promise<SpaceRecordResponse> {
  const record = await getRentalSpaceRecord(draft.id, module);
  return {
    draft: await buildDraftSummary(draft),
    config: getSpacePromptConfig(module),
    record: await toSpaceRecord(module, record)
  };
}

/** 幂等创建并返回当前用户草稿。 */
export async function ensureCurrentRentalDraft(userOpenid: string): Promise<RentalDraftSummary> {
  return buildDraftSummary(await getOrCreateRentalDraft(userOpenid));
}

/** 只读查询当前草稿，不存在时返回 null。 */
export async function readCurrentRentalDraft(userOpenid: string): Promise<RentalDraftSummary | null> {
  const draft = await getCurrentRentalDraft(userOpenid);
  return draft ? buildDraftSummary(draft) : null;
}

/** 读取本人草稿中的指定空间记录。 */
export async function readRentalSpaceRecord(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId
): Promise<SpaceRecordResponse> {
  return buildSpaceRecordResponse(await requireOwnedDraft(draftId, userOpenid), module);
}

/** 合并并自动保存点位答案、事件和切片确认状态。 */
export async function saveRentalSpaceRecord(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId,
  input: UpsertSpaceRecordInput
): Promise<SpaceRecordResponse> {
  const draft = await requireOwnedDraft(draftId, userOpenid);
  const config = getSpacePromptConfig(module);
  if (input.promptVersion !== config.promptVersion) {
    throw new AppError(BizCode.INVALID_PARAMS, '记录问题已更新，请刷新页面后继续');
  }

  const current = await getRentalSpaceRecord(draftId, module);
  const recordId = await upsertRentalSpaceRecord({
    draftId,
    module,
    promptVersion: config.promptVersion,
    sceneAnswers: normalizeAnswers(input.sceneAnswers ?? parseSceneAnswers(current?.scene_answers ?? null), module),
    eventText: input.eventText === undefined ? (current?.event_text ?? null) : input.eventText.trim() || null,
    eventVoiceUrl:
      input.eventVoiceUrl === undefined ? (current?.event_voice_url ?? null) : input.eventVoiceUrl.trim() || null,
    eventOccurredPeriod:
      input.eventOccurredPeriod === undefined ? (current?.event_occurred_period ?? null) : input.eventOccurredPeriod,
    isSliceConfirmed: input.isSliceConfirmed ?? Number(current?.is_slice_confirmed ?? 0) === 1
  });
  await refreshRentalSpaceRecordCompletion(recordId);
  return buildSpaceRecordResponse(draft, module);
}

/**
 * 绑定现场照片到点位。
 * 依次校验所有权、完全重复哈希和一次性拍摄挑战，任一失败都不计入完整度。
 */
export async function addRentalSpacePhoto(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId,
  input: AttachSpacePhotoInput
): Promise<SpaceRecordResponse> {
  const draft = await requireOwnedDraft(draftId, userOpenid);
  const asset = await getOwnedPhotoAsset(input.assetId, userOpenid);
  if (!asset) throw new AppError(BizCode.NOT_FOUND, '图片不存在或不属于当前用户');
  if (await isPhotoContentUsedInDraft(draftId, asset.content_hash, asset.id)) {
    throw new AppError(BizCode.INVALID_PARAMS, '这张照片已经用于本篇屋檐记，请为当前空间重新拍摄');
  }
  const capturedAt = input.capturedAt ? new Date(input.capturedAt) : undefined;
  if (capturedAt && Number.isNaN(capturedAt.getTime())) {
    throw new AppError(BizCode.INVALID_PARAMS, '拍摄时间格式不正确');
  }
  const challengeAccepted = await consumeCaptureChallenge(
    input.captureChallengeId,
    userOpenid,
    draftId,
    module
  );
  if (!challengeAccepted) {
    throw new AppError(BizCode.INVALID_PARAMS, '拍摄任务已过期，请重新获取拍摄提示');
  }

  let record = await getRentalSpaceRecord(draftId, module);
  if (!record) {
    const config = getSpacePromptConfig(module);
    const recordId = await upsertRentalSpaceRecord({
      draftId,
      module,
      promptVersion: config.promptVersion,
      sceneAnswers: [],
      eventText: null,
      eventVoiceUrl: null,
      eventOccurredPeriod: null,
      isSliceConfirmed: false
    });
    record = await getRentalSpaceRecord(draftId, module);
    if (!record) throw new AppError(BizCode.UNKNOWN, `无法创建空间记录 ${recordId}`);
  }

  await attachRentalSpacePhoto(
    record.id,
    input.assetId,
    input.visibility,
    input.captureChallengeId,
    capturedAt
  );
  await queueConfiguredPhotoAnalysis(input.assetId, ['HOUSEHOLD_CONSISTENCY'], draftId);
  await refreshRentalSpaceRecordCompletion(record.id);
  return buildSpaceRecordResponse(draft, module);
}

/** 为当前点位签发一个十五分钟有效的一次性随机拍摄任务。 */
export async function issueRentalCaptureChallenge(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId
): Promise<PhotoCaptureChallenge> {
  await requireOwnedDraft(draftId, userOpenid);
  return createCaptureChallenge(userOpenid, draftId, module, getRandomCapturePrompt(module));
}

/** 获取属于当前用户和草稿的空间记录。 */
async function requireSpaceRecord(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId
): Promise<RentalDraftRecordRow> {
  await requireOwnedDraft(draftId, userOpenid);
  const record = await getRentalSpaceRecord(draftId, module);
  if (!record) throw new AppError(BizCode.NOT_FOUND, '空间记录不存在');
  return record;
}

/** 修改本人草稿照片的公开范围。 */
export async function changeRentalSpacePhoto(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId,
  photoId: string,
  input: UpdateSpacePhotoInput
): Promise<SpaceRecordResponse> {
  const draft = await requireOwnedDraft(draftId, userOpenid);
  const record = await requireSpaceRecord(userOpenid, draftId, module);
  const changed = await updateRentalSpacePhotoVisibility(record.id, photoId, input.visibility);
  if (!changed) throw new AppError(BizCode.NOT_FOUND, '空间照片不存在');
  return buildSpaceRecordResponse(draft, module);
}

/** 删除本人草稿中的照片并重新计算点位完整度。 */
export async function removeRentalSpacePhoto(
  userOpenid: string,
  draftId: string,
  module: HouseModuleId,
  photoId: string
): Promise<SpaceRecordResponse> {
  const draft = await requireOwnedDraft(draftId, userOpenid);
  const record = await requireSpaceRecord(userOpenid, draftId, module);
  const deleted = await deleteRentalSpacePhoto(record.id, photoId);
  if (!deleted) throw new AppError(BizCode.NOT_FOUND, '空间照片不存在');
  await refreshRentalSpaceRecordCompletion(record.id);
  return buildSpaceRecordResponse(draft, module);
}

/** 判断外部输入是否为允许的图片可见性枚举。 */
export function isEvidenceVisibility(value: unknown): value is EvidenceVisibility {
  return value === 'PUBLIC' || value === 'VERIFICATION_ONLY';
}

/** 发布六点均完整的草稿，并根据配置执行图片安全门禁。 */
export async function publishRentalDraft(userOpenid: string, draftId: string): Promise<{ rentalId: string }> {
  const result = await publishRentalDraftTransaction(
    draftId,
    userOpenid,
    process.env.PHOTO_SAFETY_ENFORCEMENT === 'true'
  );
  if (result.status === 'INCOMPLETE') {
    throw new AppError(BizCode.INVALID_PARAMS, '请先完成六个空间记录');
  }
  if (result.status === 'UNSAFE_PHOTOS') {
    throw new AppError(BizCode.INVALID_PARAMS, '部分公开照片尚未通过安全检查');
  }
  return { rentalId: result.rentalId };
}
