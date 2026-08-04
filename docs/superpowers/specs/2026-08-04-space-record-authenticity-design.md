# 空间记录与居住可信依据功能规格

## Objective

为真实居住者提供一套非传统表单式的房屋记录流程。用户从三维房屋的六个高亮点进入独立空间任务，逐点记录现场照片、日常状态和具体事件；系统保存草稿、展示房屋完整度，并在发布后通过连续居住记录和可选凭证形成可解释的可信依据。

目标用户是愿意分享真实租住体验、但不愿公开精确地址或全部照片的社区用户。成功标准不是提交字段数量，而是读者能够看到具体空间、具体情境和具体影响。

## Confirmed Assumptions

1. 六个模块固定为 `kitchen`、`bathroom`、`living`、`bedroom`、`hallway`、`neighborhood`。
2. 每个模块至少需要一张通过小程序相机现场拍摄的照片；照片由用户选择 `PUBLIC` 或 `VERIFICATION_ONLY`。
3. 六个模块全部完成后才允许首次发布，发布前始终是仅本人可见的服务端草稿。
4. 房屋完整度只表示六个模块的完成比例；可信依据只展示证据类型，不提供真实性分数。
5. 现有故事列表、收藏、评论、举报接口继续可用，不删除现有返回字段。
6. 用户负责真机体验和验收；本轮开发编写测试，但不代用户运行自动化或可视化测试。
7. 图片分析服务商暂不绑定；上传、业务记录和分析任务解耦，未来可同时接入家庭空间一致性模型、网图风险服务和图片安全合规服务。

## User Flow

### 1. 进入三维房屋

- 页面加载时请求当前未发布草稿；不存在时创建一个空草稿。
- 已完成点位常亮，当前选中点位呼吸闪烁，其余点位保持低亮。
- 房屋亮度按已完成模块数计算：`completedModuleCount / 6 * 100`。

### 2. 点击高亮点

- 点击点位后仅弹出轻量气泡，展示模块名称、一句场景引导、当前状态和“去补充”。
- 点击“去补充”跳转到 `pages/share/point/index?draftId=<id>&module=<module>`。
- 返回时重新拉取草稿摘要，避免仅依赖页面内存状态。

### 3. 完成空间记录

任务页采用单屏分步卡片，不同时展示长表单：

1. `拍下此刻`：展示随机拍摄提示，调用相机拍摄；上传后选择“公开展示”或“仅用于核验”。
2. `还原日常`：根据模块展示 4-6 个场景卡，以单选、频率滑杆或状态选择完成至少 3 项。
3. `讲一件具体发生过的事`：引导包含发生时段、事件、影响和应对；支持文字或语音二选一。
4. `生成空间切片`：预览公开照片、场景观察和用户原话，确认后完成该点位。

每一步离开页面前自动保存。网络失败时保留页面状态并提供重试，不把失败状态显示为已完成。

### 4. 发布与后续记录

- 六点完成后，三维房屋页面显示“完成这篇屋檐记”。
- 发布操作将草稿和六个空间记录在事务中固化为故事；封面取第一张公开照片，没有公开照片时使用产品默认封面。
- 发布后可收到微打卡任务。三次有效打卡需跨至少 7 个自然日且覆盖至少 2 个时段。
- 用户可选上传已打码租约、水电账单或配送记录，仅管理员可查看。
- 图片上传成功后立即可继续填写；分析在后台异步执行。公开发布前，所有公开图片必须通过安全合规检查。

## Module Prompts

| 模块 | 场景问题范围 | 事件引导示例 |
| --- | --- | --- |
| 厨房 | 做饭频率、油烟、台面收纳、水压排水、电器安全、虫害 | 最近一次做饭时，什么最影响操作？你如何处理？ |
| 厕所 | 热水、水压、排水、异味、通风、霉斑、干湿分离 | 最近一次洗澡或清洁时，发生了什么？ |
| 客厅 | 采光、噪声、温度、通风、动线、合住冲突 | 一次休息或多人共处时，空间带来了什么影响？ |
| 房间 | 睡眠噪声、遮光、冷热、湿度、收纳、隐私、插座 | 最近一次被吵醒、闷热或感到舒适是什么时候？ |
| 楼道 | 门禁、电梯、照明、卫生、异味、快递、夜间安全 | 最近一次深夜回家或收快递时体验如何？ |
| 周边环境 | 夜路、交通、买菜、外卖、施工噪声、积水、垃圾、安全 | 最近一次出门办事或夜间回家遇到了什么？ |

## Completion And Trust Evidence

### 房屋完整度

模块完成条件：

- 至少一张有效现场照片；
- 至少完成三个场景问题；
- 具体事件包含文字，或存在有效语音；
- 用户确认空间切片。

完整度由服务端根据六个模块计算，前端不得自行提交百分比。

### 可信依据

公开标识只有以下四种：

- `空间记录完整`：六个模块均完成并发布。
- `连续居住记录`：三次有效微打卡跨至少七天和两个时段。
- `居住凭证已核验`：管理员已核验私密凭证。
- `照片仅作核验`：故事包含不公开的核验照片。

详情接口不会返回私密照片 URL、凭证 URL、精确拍摄位置或内部风控结果。

## Data Model

### `rental_story_drafts`

- `id`, `user_openid`
- `status`: `DRAFT | PUBLISHED | ABANDONED`
- `published_rental_id`: 发布后关联现有 `rentals.id`
- `created_at`, `updated_at`, `published_at`
- 同一用户最多一个 `DRAFT` 状态记录，由服务层保证幂等获取。

### `rental_space_records`

- `id`, `draft_id`, `module_type`
- `scene_answers`: JSON，保存带版本的模块答案
- `event_text`, `event_voice_url`, `event_occurred_period`
- `is_slice_confirmed`, `completed_at`, `created_at`, `updated_at`
- 唯一索引：`(draft_id, module_type)`。

### `rental_space_photos`

- `id`, `space_record_id`, `photo_asset_id`
- `visibility`: `PUBLIC | VERIFICATION_ONLY`
- `capture_challenge_id`, `captured_at`
- `created_at`
- 私密图片只通过所有者草稿接口和管理员核验接口读取。

### `photo_assets`

- `id`, `owner_openid`, `file_url`, `mime_type`, `file_size`, `width`, `height`
- `content_hash`: 原始文件 SHA-256，用于完全重复检测
- `perceptual_hash`: 归一化图片感知哈希，用于压缩、缩放和轻微编辑后的近似重复检测
- `upload_source`: `CAMERA | ALBUM | OTHER`
- `safety_status`: `PENDING | PASSED | REVIEW | REJECTED | FAILED`
- `household_status`: `UNCHECKED | PENDING | CONSISTENT | SUSPICIOUS | INCONCLUSIVE | FAILED`
- `created_at`, `updated_at`

`photo_assets` 是图片的统一内部身份。业务表只引用 `photo_asset_id`，避免未来接入 AI 时在空间照片、打卡照片和凭证照片中重复增加分析字段。

### `photo_analysis_jobs`

- `id`, `photo_asset_id`
- `analysis_type`: `SAFETY | HOUSEHOLD_CONSISTENCY | INTERNET_SOURCE_RISK`
- `status`: `PENDING | RUNNING | SUCCEEDED | FAILED | CANCELLED`
- `provider`, `model_version`, `policy_version`
- `reference_scope`: 本次家庭一致性比较所使用的故事或草稿范围
- `result_code`, `risk_level`, `signals`: 归一化结果与 JSON 风险信号
- `provider_payload`: 加密或受限保存的原始服务结果，不进入业务 API
- `attempt_count`, `next_retry_at`, `created_at`, `finished_at`

同一图片可以运行多种分析任务，也可以在模型或安全策略升级后重新分析。业务代码只读取归一化状态，不依赖具体厂商字段。

### `rental_residency_checkins`

- `id`, `rental_id`, `user_openid`, `period`, `note`
- `photo_url`, `photo_visibility`, `content_hash`
- `status`: `VALID | FLAGGED | REJECTED`
- `captured_at`, `created_at`

现有 `rental_post_proofs` 增加 `verification_status`、`verified_by`、`verified_at`，继续承担私密凭证存储，避免创建重复资源。

## Shared Contracts

```ts
export type HouseModuleId =
  | 'kitchen'
  | 'bathroom'
  | 'living'
  | 'bedroom'
  | 'hallway'
  | 'neighborhood';

export type EvidenceVisibility = 'PUBLIC' | 'VERIFICATION_ONLY';

export type PhotoAnalysisStatus = 'PENDING' | 'PASSED' | 'REVIEW' | 'REJECTED' | 'FAILED';

export interface PhotoAssetUploadResponse {
  assetId: string;
  url: string;
  safetyStatus: PhotoAnalysisStatus;
}

export interface RentalDraftSummary {
  id: string;
  completedModules: HouseModuleId[];
  completion: number;
  canPublish: boolean;
  updatedAt: string;
}

export interface UpsertSpaceRecordInput {
  sceneAnswers: Array<{ promptId: string; value: string | number }>;
  eventText?: string;
  eventVoiceUrl?: string;
  eventOccurredPeriod?: 'MORNING' | 'DAYTIME' | 'EVENING' | 'LATE_NIGHT';
  isSliceConfirmed: boolean;
}
```

具体模块题目由服务端返回带 `promptVersion` 的配置，客户端提交 `promptId + value`，避免文案调整破坏历史数据。

家庭一致性分析只返回面向业务的粗粒度状态。模型置信度、识别标签、匹配图片来源和安全服务原始原因属于内部审核信息，不进入公开共享合同。

## API Contract

所有响应继续使用项目现有 `ApiResponse<T>`。

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/rental-drafts` | 幂等创建或返回当前草稿 |
| `GET` | `/api/rental-drafts/current` | 获取当前草稿摘要和六点状态 |
| `GET` | `/api/rental-drafts/:id/space-records/:module` | 获取本人某点位草稿和题目配置 |
| `PATCH` | `/api/rental-drafts/:id/space-records/:module` | 自动保存结构化答案和事件 |
| `POST` | `/api/rental-drafts/:id/space-records/:module/photos` | 绑定已上传照片、可见性和拍摄挑战 |
| `PATCH` | `/api/rental-drafts/:id/space-records/:module/photos/:photoId` | 修改照片可见性 |
| `DELETE` | `/api/rental-drafts/:id/space-records/:module/photos/:photoId` | 删除本人草稿照片 |
| `POST` | `/api/rental-drafts/:id/publish` | 校验六点并事务发布故事 |
| `POST` | `/api/rentals/:id/checkins` | 创建发布后的微打卡 |
| `GET` | `/api/rentals/:id/checkins/summary` | 返回公开可信依据摘要 |
| `GET` | `/api/photo-assets/:id/analysis` | 所有者读取本人图片的粗粒度分析进度 |

错误码需要稳定区分：`DRAFT_NOT_FOUND`、`DRAFT_FORBIDDEN`、`SPACE_RECORD_INCOMPLETE`、`PHOTO_CHALLENGE_EXPIRED`、`DRAFT_ALREADY_PUBLISHED`。所有草稿路由必须校验 token 中的 `openid` 与草稿所有者一致。

现有 `/api/upload` 响应以向后兼容方式新增 `assetId` 和 `safetyStatus`，保留 `url`。上传事务完成后写入分析任务队列；第三方模型调用由后端 adapter/worker 执行，不允许小程序直接持有厂商密钥。

## Image Analysis Pipeline

1. 上传边界校验 MIME、扩展名、大小和实际解码结果，生成 `photo_asset_id`。
2. 同步计算 SHA-256；感知哈希可以同步计算或进入轻量任务。
3. 创建安全合规任务；未来按配置创建家庭一致性和网图来源风险任务。
4. worker 通过统一 `PhotoAnalyzer` adapter 调用服务商，将结果映射为内部状态。
5. 安全结果为 `REJECTED` 时禁止公开发布；`REVIEW` 时进入人工复核；服务失败采用有限重试并保持可观察状态。
6. 家庭一致性模型以同一草稿/故事内已通过安全审核的照片为参考，输出 `CONSISTENT`、`SUSPICIOUS` 或 `INCONCLUSIVE`。
7. `SUSPICIOUS` 只降低该照片作为可信依据的权重并触发复核，不自动判定网图或虚假居住。

“是否为网图”不能仅靠生成式 AI 可靠判断。后续如需该能力，应组合图片指纹库、感知哈希、可选反向图片搜索服务和家庭空间一致性模型，并保留各自独立的证据信号。

## Compatibility

- `RentalListing` 仅新增可选 `coverPhoto`、`trustLabels`，原字段保持不变。
- `RentalDetail` 新增可选 `spaceRecords` 和 `trustEvidence`，旧故事没有空间记录时继续展示 `experience + photos`。
- 发布时把空间事件摘要写入现有 `experience`，公开照片写入现有 `photos`，保证旧列表和历史页面无需同步迁移。
- 搜索、价格、租赁类型和标签不重新引入。

## UI Structure

```text
pages/share/
├── index.tsx
├── point/
│   ├── index.tsx
│   ├── index.config.ts
│   ├── index.scss
│   └── components/
│       ├── CaptureStep/
│       ├── DailySceneStep/
│       ├── EventStoryStep/
│       ├── SpaceSlicePreview/
│       └── StepProgress/
└── components/HouseExplorer/
```

页面入口只负责草稿加载、步骤状态和组件组合。模块题目、校验和 API 类型不写死在 UI 组件中。

## Commands

- 安装：`pnpm install`
- 前端开发：`pnpm dev:frontend`
- 后端开发：`pnpm dev:backend`
- 类型检查：`pnpm typecheck`
- 代码检查：`pnpm lint`
- 前端构建：`pnpm build:frontend`
- 后端构建：`pnpm build:backend`

## Testing Strategy

- 共享层：合同类型和模块枚举覆盖。
- 后端单元测试：完成度计算、所有权、私密 URL 过滤、跨日跨时段打卡判定。
- 后端路由测试：未登录、越权、无效模块、重复发布和事务回滚。
- 前端组件测试：步骤切换、自动保存失败重试、隐私选择和返回刷新。
- 真机验收由用户执行：相机权限、上传、页面滚动、三维场景恢复和弱网续填。

## Boundaries

### Always

- 在共享合同定义输入输出后再实现接口。
- 服务端计算完整度和可信依据，所有写接口校验身份与资源所有权。
- 私密照片和凭证默认拒绝公开读取。
- 所有用户上传图片执行安全合规检查，包括仅核验图片；分析服务通过后端适配器调用并记录模型及策略版本。
- 每个垂直切片同时适配共享合同、后端和前端。

### Ask First

- 引入语音转写、图片识别或第三方审核服务。
- 收集精确定位、设备指纹或其他高敏感信息。
- 改变“六点全部完成才能发布”的规则。

### Never

- 展示真实性分数或宣称内容绝对真实。
- 因单次 AI 判定直接封禁用户或公开“使用网图”的结论。
- 在公开接口返回核验专用照片、凭证或内部异常原因。
- 为新功能恢复价格、房型、租赁类型、标签等字段。
- 未经用户要求提交代码或运行测试。

## Success Criteria

- 用户点击任一高亮点可进入正确模块任务，并在退出重进后恢复服务端草稿。
- 六个模块都能完成四步空间记录；未完成时服务端拒绝发布并指出模块。
- 私密照片可参与完成度和可信依据，但永不出现在公开详情响应。
- 三维房屋按服务端完成度点亮，完成点位状态与后端一致。
- 发布后的故事可继续被现有发现页、我的屋檐记、收藏和历史页面读取。
- 三次跨七天、跨两个时段的有效打卡产生 `连续居住记录`，不满足时不产生。
- AI 或安全服务可替换而不修改前端业务合同；分析失败可重试且不会丢失上传图片。
- 安全审核未通过的图片不能公开发布；家庭一致性异常只进入复核，不作为自动造假结论。
- 老故事详情正常展示，不要求补录空间点位。

## Open Questions

- 首版语音是否只保存音频，还是需要用户手工确认一段文字摘要。
- 私密凭证的管理员核验后台是否纳入本次迭代；若不纳入，状态只到 `SUBMITTED`。
