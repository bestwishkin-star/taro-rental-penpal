import type {
  EvidenceVisibility,
  HouseModuleId,
  PhotoSafetyStatus,
  PublishedRentalSpaceResponse,
  PublishedSpaceRecord,
  RentalEventPeriod,
  SpaceSceneAnswer
} from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

import { parseSceneAnswers } from './rental-draft.repository';
import { getSpacePromptConfig } from './rental-space-prompts';

/** 已发布空间记录的公开字段。 */
interface PublicRecordRow extends RowDataPacket {
  id: string;
  module_type: HouseModuleId;
  scene_answers: string | null;
  event_text: string | null;
  event_voice_url: string | null;
  event_occurred_period: RentalEventPeriod | null;
}

/** 发布后照片及其隐私和安全状态。 */
interface PublicPhotoRow extends RowDataPacket {
  space_record_id: string;
  file_url: string;
  visibility: EvidenceVisibility;
  safety_status: PhotoSafetyStatus;
}

/** 将稳定 promptId 转换为公开详情可直接阅读的观察文案。 */
function toObservations(module: HouseModuleId, answers: SpaceSceneAnswer[]) {
  const config = getSpacePromptConfig(module);
  const prompts = new Map(config.prompts.map((prompt) => [prompt.id, prompt]));
  return answers.flatMap((answer) => {
    const prompt = prompts.get(answer.promptId);
    const value = prompt?.options.find((item) => item.value === answer.value)?.label;
    return prompt && value ? [{ label: prompt.title, value }] : [];
  });
}

/**
 * 读取已发布故事的六处空间切片。
 * 查询后在 repository 边界丢弃仅核验照片和审核风险照片，避免 URL 泄漏到上层。
 */
export async function getPublishedRentalSpaces(rentalId: string): Promise<PublishedRentalSpaceResponse> {
  const [records] = await pool.execute<PublicRecordRow[]>(
    `SELECT r.id, r.module_type, r.scene_answers, r.event_text, r.event_voice_url, r.event_occurred_period
     FROM rental_story_drafts d
     INNER JOIN rental_space_records r ON r.draft_id = d.id
     WHERE d.published_rental_id = ? AND d.status = 'PUBLISHED' AND r.completed_at IS NOT NULL
     ORDER BY FIELD(r.module_type, 'kitchen', 'bathroom', 'living', 'bedroom', 'hallway', 'neighborhood')`,
    [rentalId]
  );
  if (records.length === 0) {
    return { records: [], trustEvidence: { labels: [], hasVerificationOnlyPhotos: false } };
  }

  const [photos] = await pool.execute<PublicPhotoRow[]>(
    `SELECT p.space_record_id, a.file_url, p.visibility, a.safety_status
     FROM rental_story_drafts d
     INNER JOIN rental_space_records r ON r.draft_id = d.id
     INNER JOIN rental_space_photos p ON p.space_record_id = r.id
     INNER JOIN photo_assets a ON a.id = p.photo_asset_id
     WHERE d.published_rental_id = ? AND d.status = 'PUBLISHED'
     ORDER BY p.created_at ASC`,
    [rentalId]
  );
  const publicPhotos = new Map<string, string[]>();
  let hasVerificationOnlyPhotos = false;
  // 私密照片只形成“照片仅作核验”标识，不进入公开照片数组。
  for (const photo of photos) {
    if (photo.visibility === 'VERIFICATION_ONLY') {
      hasVerificationOnlyPhotos = true;
      continue;
    }
    if (photo.safety_status === 'REJECTED' || photo.safety_status === 'REVIEW') continue;
    const urls = publicPhotos.get(photo.space_record_id) ?? [];
    urls.push(photo.file_url);
    publicPhotos.set(photo.space_record_id, urls);
  }

  const mappedRecords: PublishedSpaceRecord[] = records.map((record) => {
    const answers = parseSceneAnswers(record.scene_answers);
    return {
      module: record.module_type,
      publicPhotos: publicPhotos.get(record.id) ?? [],
      sceneAnswers: answers,
      observations: toObservations(record.module_type, answers),
      eventText: record.event_text ?? undefined,
      eventVoiceUrl: record.event_voice_url ?? undefined,
      eventOccurredPeriod: record.event_occurred_period ?? undefined
    };
  });
  const labels: PublishedRentalSpaceResponse['trustEvidence']['labels'] = ['SPACE_RECORD_COMPLETE'];
  if (hasVerificationOnlyPhotos) labels.push('VERIFICATION_ONLY_PHOTOS');
  return {
    records: mappedRecords,
    trustEvidence: { labels, hasVerificationOnlyPhotos }
  };
}

/** 判断故事是否存在管理员已核验的私密居住凭证。 */
export async function hasVerifiedRentalProof(rentalId: string): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 1
     FROM rental_post_proofs p
     INNER JOIN rental_proof_verifications v ON v.proof_id = p.id
     WHERE p.rental_id = ? AND v.verification_status = 'VERIFIED'
     LIMIT 1`,
    [rentalId]
  );
  return rows.length > 0;
}
