# 房屋实录发现与月度成长树设计

## 目标

将现有“翻看屋檐故事”改造为房屋实录发现入口。用户可以公开自己持续维护的居住记录，其他用户从照片内容流发现房屋，进入房主的月度成长树，并打开某个更新日期对应的三维房屋快照。

本期解决三个问题：

1. 发现页不再围绕价格、房型、租赁类型和标签，而是围绕房屋照片、居住片段和最近更新时间。
2. 已发布房屋不再只有一个永远变化的“当前详情”，每次主动更新会保存当天的公开快照。
3. 最近一个月的更新历史通过游戏化成长树呈现，日期节点与指定日期的三维模型分成两个页面。

## 已确认规则

1. 对外名称统一为“房屋实录”，不使用“共享房屋模型”。
2. 六个空间点位全部完成、完整度达到 100% 后，才允许首次公开。
3. 用户在空间记录中继续编辑当前状态，点击“更新房屋实录”后才生成或覆盖当天公开快照。
4. 同一自然日允许多次更新，但公开侧只保留该日期的最新快照。
5. 公开时间线只返回最近 30 个自然日内存在快照的日期；没有更新的日期完全不展示节点。
6. 成长树和三维模型是两个独立页面。点击日期节点后进入该日期的模型页。
7. 发现列表使用公开照片和摘要卡片，不在列表中同时运行多个 WebGL 画布。
8. 本期只提供浏览，不新增收藏、评论、举报等交互；现有旧接口不删除。
9. 公开身份只展示头像、昵称、首次公开时间、最近更新时间和可解释的可信依据标签。
10. 精确地址、微信、核验专用照片、凭证、内部分析状态和风险原因永不进入公开响应。
11. 随机日常任务和连续任务打卡不在本期实现，但快照来源预留 `MANUAL_UPDATE | RANDOM_TASK | SYSTEM`。
12. 用户负责真机和视觉验收；本期编写必要测试代码，但不代替用户运行小程序测试。

## 核心流程

### 首次公开

1. 用户在 `pages/share/index` 完成六个空间点位。
2. 服务端返回 `completion = 100` 和 `canPublish = true`。
3. 用户确认首次公开。
4. 发布事务创建或关联现有 `rentals` 记录，将草稿标记为 `PUBLISHED`，并写入当天第一份公开快照。
5. 发布成功后跳转到自己的房屋实录成长树。

### 后续更新

1. 已发布用户继续进入房屋模型，并编辑任意空间记录。
2. 私有当前态立即保存，但公开侧仍读取上一次快照。
3. 页面检测到当前态晚于最近快照时，显示“更新房屋实录”。
4. 用户确认后，服务端在事务中复制六个空间的公开字段和公开照片引用。
5. 当天已有快照时覆盖当天快照及其空间明细；否则新增当天快照。
6. 更新成功后刷新模型完整度、最近更新时间和成长树节点。

### 浏览他人房屋实录

1. 发现页请求公开房屋实录列表，展示封面照片、内容片段、作者和最近更新时间。
2. 点击卡片进入该房屋的成长树页面。
3. 页面默认展示最近 30 天真实存在的更新节点，并自动定位到最新节点。
4. 点击花朵或果实日期节点，导航到指定 `snapshotDate` 的三维模型页面。
5. 模型页面只读取该日期的公开快照，不读取房主当前未公开的编辑状态。

## 页面设计

### 发现页 `pages/find/index`

- 页面标题使用“房屋实录”。
- 卡片主视觉是公开照片，正文只保留一段可扫描的居住片段。
- 辅助信息包括作者头像、昵称、最近更新时间、近 30 天更新次数和可信依据标签。
- 搜索只匹配公开标题、居住正文和空间公开事件，不恢复价格、户型、租赁类型或标签筛选。
- 空状态、加载失败和分页继续沿用 `AppLayout` 的滚动容器。

### 成长树页 `pages/house-record/timeline/index`

- 使用 375px 设计稿对应的纵向长场景，页面通过主滚动容器探索。
- 背景是原创明亮童话巨树，包含花冠、树屋、瀑布和根系花园。
- 普通更新日期使用花朵节点，最新日和完整记录里程碑使用果实节点。
- 只渲染有快照的日期，节点沿树干交替分布，避免一个月 30 个占位节点堆叠。
- 顶部展示作者信息、近 30 天更新次数和最近更新时间。
- 节点点击区域不小于 44px，并提供按压反馈；日期是节点的无障碍名称。
- 背景图和节点层分离，后续可以更换美术资源而不改时间线数据结构。

### 按日模型页 `pages/house-record/model/index`

- 路由参数为 `rentalId` 和 `snapshotDate`。
- 复用现有 `HouseExplorer` 的 Three.js 场景、模型资源和触摸控制。
- 三维场景读取指定快照的六空间公开记录，热点完成状态不受房主当前草稿影响。
- 顶部显示所选日期，并提供返回成长树的标准返回路径。
- 点击空间热点展示该日公开照片、观察和事件；没有公开照片时只展示公开文字信息。
- 模型交互区域阻止页面滚动，离开模型区域后页面恢复纵向滚动。

## 数据边界

现有 `rental_story_drafts`、`rental_space_records` 和 `rental_space_photos` 继续承担房主可编辑的当前态。公开历史必须复制为不可依赖当前态的快照，避免旧日期随着后续编辑被改写。

### `rental_public_snapshots`

- `id VARCHAR(36) PRIMARY KEY`
- `rental_id VARCHAR(36) NOT NULL`
- `owner_openid VARCHAR(64) NOT NULL`
- `snapshot_date DATE NOT NULL`
- `source VARCHAR(32) NOT NULL`
- `title VARCHAR(120)`
- `content_preview VARCHAR(500)`
- `cover_photo_url VARCHAR(512)`
- `created_at DATETIME NOT NULL`
- `updated_at DATETIME NOT NULL`
- 唯一索引：`(rental_id, snapshot_date)`
- 查询索引：`(rental_id, snapshot_date DESC)`、`(updated_at DESC)`

### `rental_public_snapshot_spaces`

- `id VARCHAR(36) PRIMARY KEY`
- `snapshot_id VARCHAR(36) NOT NULL`
- `module_type VARCHAR(32) NOT NULL`
- `prompt_version VARCHAR(32) NOT NULL`
- `scene_answers JSON`
- `observations JSON`
- `event_text TEXT`
- `event_voice_url VARCHAR(512)`
- `event_occurred_period VARCHAR(32)`
- `created_at DATETIME NOT NULL`
- 唯一索引：`(snapshot_id, module_type)`

### `rental_public_snapshot_photos`

- `id VARCHAR(36) PRIMARY KEY`
- `snapshot_space_id VARCHAR(36) NOT NULL`
- `photo_asset_id VARCHAR(36) NOT NULL`
- `file_url VARCHAR(512) NOT NULL`
- `sort_order INT UNSIGNED NOT NULL`
- `created_at DATETIME NOT NULL`
- 唯一索引：`(snapshot_space_id, photo_asset_id)`

快照只复制 `PUBLIC` 且安全状态允许公开的照片。复制 `file_url` 是为了保证历史展示稳定；同时保留 `photo_asset_id` 便于未来安全策略变化时批量隐藏。

## 共享合同

```ts
export type RentalSnapshotSource = 'MANUAL_UPDATE' | 'RANDOM_TASK' | 'SYSTEM';

export interface HouseRecordAuthor {
  nickname: string;
  avatar: string;
}

export interface HouseRecordListing {
  rentalId: string;
  title: string;
  contentPreview: string;
  coverPhoto?: string;
  author: HouseRecordAuthor;
  trustLabels: RentalTrustLabel[];
  recentUpdateCount: number;
  latestSnapshotDate: string;
  updatedAt: string;
}

export interface HouseRecordTimelineNode {
  snapshotDate: string;
  source: RentalSnapshotSource;
  updatedModules: HouseModuleId[];
  contentPreview?: string;
  coverPhoto?: string;
  isLatest: boolean;
}

export interface HouseRecordTimelineResponse {
  rentalId: string;
  title: string;
  author: HouseRecordAuthor;
  trustLabels: RentalTrustLabel[];
  rangeStart: string;
  rangeEnd: string;
  nodes: HouseRecordTimelineNode[];
}

export interface HouseRecordSnapshotResponse {
  rentalId: string;
  snapshotDate: string;
  source: RentalSnapshotSource;
  records: PublishedSpaceRecord[];
  trustEvidence: RentalTrustEvidence;
}
```

所有日期合同使用 `YYYY-MM-DD`，由服务端按 `Asia/Shanghai` 计算自然日。数据库写入使用 MySQL `DATE` 和 `DATETIME`，禁止直接向 `DATETIME` 写入 ISO 字符串。

## API

所有接口使用现有 `ApiResponse<T>`。

| Method | Path | 说明 |
| --- | --- | --- |
| `GET` | `/api/house-records` | 分页返回公开房屋实录卡片 |
| `GET` | `/api/house-records/:rentalId/timeline?days=30` | 返回最近 30 天存在的快照节点 |
| `GET` | `/api/house-records/:rentalId/snapshots/:date` | 返回指定日期公开空间快照 |
| `POST` | `/api/rentals/:rentalId/snapshots` | 房主将当前态发布为当天快照 |
| `GET` | `/api/rentals/:rentalId/snapshot-status` | 房主读取最近快照和是否存在未公开修改 |

写接口必须校验登录身份、房屋所有权、已发布状态和六空间完整性。公开读接口只返回活动状态房屋和已生成快照。

稳定错误码：

- `RENTAL_NOT_FOUND`
- `RENTAL_FORBIDDEN`
- `RENTAL_NOT_PUBLISHED`
- `SPACE_RECORD_INCOMPLETE`
- `SNAPSHOT_NOT_FOUND`
- `SNAPSHOT_PHOTO_NOT_PUBLIC`

## 服务边界

后端沿用 `route -> service -> repository -> MySQL`：

- `house-record.repository.ts` 负责发现列表、时间线和公开快照读取。
- `house-record-snapshot.repository.ts` 负责同日快照事务写入。
- `house-record.service.ts` 负责公开过滤、作者摘要、可信依据和日期窗口。
- `house-record-snapshot.service.ts` 负责所有权、完整度、同日覆盖和快照状态判断。

前端沿用 `page -> API service -> HTTP`：

- `pages/find` 只管理搜索、分页和卡片组合。
- `pages/house-record/timeline` 管理时间线请求和节点导航。
- `pages/house-record/model` 管理指定日期快照和三维场景生命周期。
- 成长树背景和花果节点从 Pencil 设计稿导出到页面专属 `assets/`，不使用字体图标或 emoji。

## 错误与降级

- 发现列表封面缺失时使用产品默认房屋实录封面，不暴露核验照片。
- 时间线无节点时显示“这方屋檐还没有留下公开更新”，不生成虚假日期。
- 某张历史公开照片后续被安全策略隐藏时，只移除该照片，保留当天文字快照。
- 指定日期不存在时返回 `404 + SNAPSHOT_NOT_FOUND`，前端提供返回成长树操作。
- Three.js 初始化失败时展示当天空间图文列表，页面仍可浏览。
- 快照发布失败时保留当前私有编辑状态，不更新公开更新时间，并允许重试。

## 兼容与迁移

1. 现有 `rentals` 继续作为公开主体，不创建第二套房屋主表。
2. 迁移后，为已有完整空间记录的已发布房屋生成一份 `SYSTEM` 初始快照；没有完整空间记录的旧故事不进入房屋实录发现列表。
3. 现有 `/api/rentals`、旧详情、收藏、评论和举报接口保持兼容，但新发现页改用 `/api/house-records`。
4. 现有 `PublishedSpaceRecord` 继续复用，指定日期接口只改变数据来源，不改变空间展示合同。

## 测试设计

- 合同测试：日期格式、快照来源枚举、公开响应不包含私密字段。
- Repository 测试：30 天窗口、仅返回存在日期、同日唯一、最新排序、公开照片过滤。
- Service 测试：首次发布生成快照、同日覆盖、跨日新增、所有权和完整度校验。
- 路由测试：未登录、越权、未发布、日期非法、快照不存在。
- 前端测试：发现分页、成长树只渲染返回节点、日期导航参数、模型页按日期加载和降级图文状态。
- 真机验收由用户执行：成长树滚动、节点点击、三维模型触摸、页面返回、弱网和不同安全区。

## 成功标准

1. 发现页只展示具有公开快照的房屋实录，卡片重点是照片和居住内容。
2. 完整度不足 100% 的房屋无法首次公开或生成公开快照。
3. 用户当天多次更新后，时间线只出现一个当天节点，并读取最后一次确认的数据。
4. 最近 30 天没有更新的日期不展示任何占位节点。
5. 点击任意节点进入正确日期的模型页，六空间内容不会被后续编辑改写。
6. 公开响应不包含微信、精确地址、核验照片、凭证或内部分析结果。
7. 三维场景失败时仍能浏览当天公开图文，不出现白屏。
8. 旧故事和旧接口保持可用，不要求历史用户补录空间信息。

## 非本期范围

- 随机日常任务生成和任务奖励。
- 连续签到排行榜、成长值经济系统或社交互动。
- 评论、收藏和举报在新房屋实录页面中的重新接入。
- AI 家庭一致性、安全合规或网图风险服务商的实际接入。
- 多年历史归档、月份切换和超过 30 天的公开时间线浏览。
