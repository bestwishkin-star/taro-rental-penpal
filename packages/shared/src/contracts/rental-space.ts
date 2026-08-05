/** 房屋中必须完成记录的六个固定空间点位。 */
export const HOUSE_MODULE_IDS = [
  'kitchen',
  'bathroom',
  'living',
  'bedroom',
  'hallway',
  'neighborhood'
] as const;

/** 六个房屋点位常量推导出的联合类型。 */
export type HouseModuleId = (typeof HOUSE_MODULE_IDS)[number];

/** 服务端草稿生命周期，草稿发布后不再允许修改原始空间记录。 */
export type RentalDraftStatus = 'DRAFT' | 'PUBLISHED' | 'ABANDONED';

/** 图片对社区读者的可见范围。 */
export type EvidenceVisibility = 'PUBLIC' | 'VERIFICATION_ONLY';

/** 图片进入平台时的来源，用于区分现场拍摄和相册选择。 */
export type PhotoUploadSource = 'CAMERA' | 'ALBUM' | 'OTHER';

/** 图片安全审核状态；未配置审核服务时必须保持 UNCHECKED。 */
export type PhotoSafetyStatus = 'UNCHECKED' | 'PENDING' | 'PASSED' | 'REVIEW' | 'REJECTED' | 'FAILED';

/** AI 对多张照片是否属于同一居住空间的归一化判断。 */
export type PhotoHouseholdStatus =
  | 'UNCHECKED'
  | 'PENDING'
  | 'CONSISTENT'
  | 'SUSPICIOUS'
  | 'INCONCLUSIVE'
  | 'FAILED';
/** 可独立执行的图片分析维度，避免把不同证据信号合成一个真实性分数。 */
export type PhotoAnalysisType = 'SAFETY' | 'HOUSEHOLD_CONSISTENCY' | 'INTERNET_SOURCE_RISK';

/** 单个异步图片分析任务的执行状态。 */
export type PhotoAnalysisJobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

/** 具体居住事件发生的时段，不记录精确时间以降低隐私风险。 */
export type RentalEventPeriod = 'MORNING' | 'DAYTIME' | 'EVENING' | 'LATE_NIGHT';

/** 对外展示的可信依据，仅描述已有证据，不代表真实性评分。 */
export type RentalTrustLabel =
  | 'SPACE_RECORD_COMPLETE'
  | 'CONTINUOUS_RESIDENCY'
  | 'RESIDENCY_PROOF_VERIFIED'
  | 'VERIFICATION_ONLY_PHOTOS';

/** 服务端题目允许前端渲染的控件类型。 */
export type SpacePromptControl = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'FREQUENCY' | 'SCALE';

/** 场景问题的稳定选项值和面向用户的文案。 */
export interface SpacePromptOption {
  value: string;
  label: string;
}

/** 服务端下发的单个居住场景问题。 */
export interface SpacePrompt {
  id: string;
  title: string;
  description?: string;
  control: SpacePromptControl;
  options: SpacePromptOption[];
  isRequired: boolean;
}

/** 某个空间模块的版本化题目配置。 */
export interface SpacePromptConfig {
  module: HouseModuleId;
  promptVersion: string;
  capturePrompt: string;
  prompts: SpacePrompt[];
  eventPrompt: string;
}

/** 场景答案允许存储的 JSON 安全值类型。 */
export type SpaceSceneAnswerValue = string | number | boolean | string[];

/** 用户对场景问题的回答，使用 promptId 避免文案变化破坏历史记录。 */
export interface SpaceSceneAnswer {
  promptId: string;
  value: SpaceSceneAnswerValue;
}

/** 新图片资产上传成功后的最小响应。 */
export interface PhotoAssetUploadResponse {
  assetId: string;
  url: string;
  safetyStatus: PhotoSafetyStatus;
}

/** 草稿所有者可见的空间照片信息。 */
export interface SpaceRecordPhoto {
  id: string;
  assetId: string;
  url: string;
  visibility: EvidenceVisibility;
  capturedAt?: string;
  safetyStatus: PhotoSafetyStatus;
  householdStatus: PhotoHouseholdStatus;
}

/** 一个空间点位的完整草稿记录。 */
export interface RentalSpaceRecord {
  id?: string;
  module: HouseModuleId;
  promptVersion: string;
  photos: SpaceRecordPhoto[];
  sceneAnswers: SpaceSceneAnswer[];
  eventText?: string;
  eventVoiceUrl?: string;
  eventOccurredPeriod?: RentalEventPeriod;
  isSliceConfirmed: boolean;
  isComplete: boolean;
  completedAt?: string;
  updatedAt?: string;
}

/** 公开详情页可读取的空间切片，已经移除核验专用图片。 */
export interface PublishedSpaceRecord {
  module: HouseModuleId;
  publicPhotos: string[];
  sceneAnswers: SpaceSceneAnswer[];
  observations: Array<{ label: string; value: string }>;
  eventText?: string;
  eventVoiceUrl?: string;
  eventOccurredPeriod?: RentalEventPeriod;
}

/** 三维房屋页面使用的单点完成摘要。 */
export interface RentalDraftModuleSummary {
  module: HouseModuleId;
  isComplete: boolean;
  photoCount: number;
  updatedAt?: string;
}

/** 当前用户唯一未发布草稿的整体摘要。 */
export interface RentalDraftSummary {
  id: string;
  status: RentalDraftStatus;
  modules: RentalDraftModuleSummary[];
  completedModules: HouseModuleId[];
  /** 六个点位的整体完成百分比，取值范围为 0-100。 */
  completion: number;
  canPublish: boolean;
  publishedRentalId?: string;
  updatedAt: string;
}

/** 草稿详情，包含全部空间记录。 */
export interface RentalDraftDetail extends RentalDraftSummary {
  spaceRecords: RentalSpaceRecord[];
}

/** 点位页一次加载所需的草稿、题目和记录聚合响应。 */
export interface SpaceRecordResponse {
  draft: RentalDraftSummary;
  config: SpacePromptConfig;
  record: RentalSpaceRecord;
}

/** 点位自动保存输入；未提供的字段保持原值。 */
export interface UpsertSpaceRecordInput {
  promptVersion: string;
  sceneAnswers?: SpaceSceneAnswer[];
  eventText?: string;
  eventVoiceUrl?: string;
  eventOccurredPeriod?: RentalEventPeriod;
  isSliceConfirmed?: boolean;
}

/** 将已上传图片资产绑定到空间点位。 */
export interface AttachSpacePhotoInput {
  assetId: string;
  visibility: EvidenceVisibility;
  captureChallengeId: string;
  capturedAt?: string;
}

/** 一次性随机拍摄任务，过期或使用后不能再次绑定照片。 */
export interface PhotoCaptureChallenge {
  id: string;
  prompt: string;
  expiresAt: string;
}

/** 修改空间照片公开范围的输入。 */
export interface UpdateSpacePhotoInput {
  visibility: EvidenceVisibility;
}

/** 草稿首次发布成功后返回的社区故事 ID。 */
export interface PublishRentalDraftResponse {
  rentalId: string;
}

/** 图片所有者可读取的粗粒度分析状态，不包含厂商原始结果。 */
export interface PhotoAnalysisSummary {
  assetId: string;
  safetyStatus: PhotoSafetyStatus;
  householdStatus: PhotoHouseholdStatus;
  updatedAt: string;
}

/** 发布后微打卡的输入。 */
export interface CreateRentalCheckinInput {
  assetId: string;
  visibility: EvidenceVisibility;
  period: RentalEventPeriod;
  note: string;
  capturedAt: string;
}

/** 连续居住记录的服务端计算结果。 */
export interface RentalCheckinSummary {
  validCheckinCount: number;
  distinctDayCount: number;
  coveredPeriods: RentalEventPeriod[];
  firstCheckinAt?: string;
  latestCheckinAt?: string;
  hasContinuousResidency: boolean;
}

/** 公开详情页展示的可信依据汇总。 */
export interface RentalTrustEvidence {
  labels: RentalTrustLabel[];
  hasVerificationOnlyPhotos: boolean;
  checkins?: RentalCheckinSummary;
}

/** 私密居住凭证的核验状态。 */
export type RentalProofVerificationStatus = 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

/** 管理员更新居住凭证核验结果的输入。 */
export interface VerifyRentalProofInput {
  status: Exclude<RentalProofVerificationStatus, 'SUBMITTED'>;
}

/** 新式空间故事详情的公开扩展响应。 */
export interface PublishedRentalSpaceResponse {
  records: PublishedSpaceRecord[];
  trustEvidence: RentalTrustEvidence;
}
