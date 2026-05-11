# Rental Experience Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first version of a truthful rental-experience community that replaces broker-style listing sharing with real rental notes, public comments, optional proof, and rental-specific reports.

**Architecture:** Keep the current Taro frontend, Next.js backend, MySQL database, and shared contract package. Evolve the existing `rentals` domain into a community post model by adding new shared types and compatible backend fields first, then update frontend pages to use community language and workflows. Add comments, reports, proof metadata, and admin handling as focused modules instead of mixing them into the listing repository.

**Tech Stack:** Taro React, SCSS, Zustand, Next.js Route Handlers, MySQL, mysql2, TypeScript, `pnpm` workspace scripts.

---

## Scope Check

The confirmed spec spans frontend pages, backend APIs, database schema, shared contracts, comments, reports, proof upload metadata, and admin handling. This plan keeps them in one implementation plan because the feature is a single user-facing workflow. Per user preference, do not create per-task commits and do not add unit test files; finish implementation, let the user run product testing, then make one unified commit.

## File Structure

### Shared Contracts

- Modify: `packages/shared/src/contracts/rental.ts`
  - Add community post status, stay stage, rental type, proof status, report reason, post/comment/report types.
  - Keep legacy `RentalListing`, `RentalDetail`, and `CreateRentalInput` names as aliases or compatible interfaces during migration.
- Modify: `packages/shared/src/index.ts`
  - Export the updated rental contracts if the file uses explicit exports.

### Database

- Modify: `apps/backend/schema.sql`
  - Add post-oriented columns to `rentals`.
  - Add `rental_post_proofs`, `rental_post_comments`, and `rental_post_reports`.
  - Keep `favorites.rental_id` unchanged for compatibility.

### Backend Rental Domain

- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`
  - Map new fields from `rentals`.
  - Add CRUD helpers for comments, reports, proof records, and admin status updates.
- Modify: `apps/backend/src/modules/rentals/rental.service.ts`
  - Expose post, comments, reports, and admin use cases.
- Modify: `apps/backend/src/app/api/rentals/route.ts`
  - Validate community post create input.
  - Return post-list shaped data.
- Modify: `apps/backend/src/app/api/rentals/[id]/route.ts`
  - Return post detail with comment count and proof status.
- Create: `apps/backend/src/app/api/rentals/[id]/comments/route.ts`
  - List and create comments.
- Create: `apps/backend/src/app/api/rental-comments/[id]/route.ts`
  - Delete own comment.
- Create: `apps/backend/src/app/api/rentals/[id]/reports/route.ts`
  - Create rental-specific reports.
- Create: `apps/backend/src/app/api/admin/rental-post-reports/route.ts`
  - List report queue.
- Create: `apps/backend/src/app/api/admin/rental-post-reports/[id]/route.ts`
  - Read report detail.
- Create: `apps/backend/src/app/api/admin/rental-post-reports/[id]/handle/route.ts`
  - Handle report and update post status.

### Frontend API

- Modify: `apps/frontend/src/shared/api/services.ts`
  - Add comment, report, and proof-aware post APIs.
  - Keep existing function names where practical to reduce page churn.
- Create: `apps/frontend/src/pages/share/share-options.ts`
  - Centralize tags, rental types, and stay stages.
- Create: `apps/frontend/src/pages/share/share-validation.ts`
  - Pure validation helper for publish form, with Vitest coverage.

### Frontend Pages

- Modify: `apps/frontend/src/pages/share/index.tsx`
  - Rename experience publishing flow.
  - Add title, content, landmark, stay stage, rental type, truth pledge, optional proof photos.
  - Remove contact-first behavior.
- Modify: `apps/frontend/src/pages/share/index.scss`
  - Keep existing SCSS pattern and add community-note form styles.
- Modify: `apps/frontend/src/pages/find/index.tsx`
  - Treat fetched data as experience posts and keep filtering.
- Modify: `apps/frontend/src/pages/find/components/RentalCard/index.tsx`
  - Render note-style card with title, cover, city/district, rent reference, tags, comment/favorite counts, proof badge.
- Modify: `apps/frontend/src/pages/find/components/RentalCard/index.scss`
  - Update card styles without nested card-in-card layout.
- Modify: `apps/frontend/src/pages/rental-detail/index.tsx`
  - Render experience detail, rent reference module, comments, favorite, and report entry.
- Modify: `apps/frontend/src/pages/rental-detail/index.scss`
  - Add detail, comments, and report modal styles.
- Modify: `apps/frontend/src/pages/rental-list/index.tsx`
  - Rename mine/favorites/history copy to community language.
- Modify: `apps/frontend/src/pages/rental-list/index.config.ts`
  - Update navigation title if it currently says listing language.

---

## Task 1: Shared Community Rental Contracts

**Files:**
- Modify: `packages/shared/src/contracts/rental.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Replace rental contract comments with readable Chinese comments**

Open `packages/shared/src/contracts/rental.ts` and replace mojibake comments with readable Chinese comments while keeping existing exported names. This keeps the file understandable before changing the API surface.

- [ ] **Step 2: Add the community post enums and interfaces**

Add these exports to `packages/shared/src/contracts/rental.ts`:

```ts
/** 租房经历内容状态，支持前台展示和后台治理。 */
export type RentalPostStatus = 'active' | 'pending_review' | 'hidden' | 'rejected';

/** 兼容旧状态字段，旧页面仍可把 active / inactive 作为上下架状态使用。 */
export type RentalStatus = 'active' | 'inactive';

/** 用户分享经历时所处的租住阶段。 */
export type RentalStayStage = 'living' | 'moved_out' | 'viewing' | 'subletting';

/** 租住类型，用于筛选和租房参考信息。 */
export type RentalType = 'whole' | 'shared' | 'single' | 'sublet' | 'short';

/** 发布者是否提交了真实性凭证。 */
export type RentalProofStatus = 'none' | 'submitted';

/** 租房专项举报原因。 */
export type RentalReportReason =
  | 'fake_rent_or_address'
  | 'fake_experience'
  | 'agent_disguise'
  | 'phishing'
  | 'privacy_leak'
  | 'harassment'
  | 'other';

/** 租房经历卡片数据，列表页和收藏页共用。 */
export interface RentalListing {
  id: string;
  title: string;
  contentPreview?: string;
  location: string;
  province?: string;
  city?: string;
  district?: string;
  address?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  price: string;
  area: string;
  roomType: string;
  rentalType?: RentalType;
  stayStage?: RentalStayStage;
  commute?: string;
  tags: string[];
  photos: string[];
  status: RentalStatus;
  postStatus?: RentalPostStatus;
  proofStatus?: RentalProofStatus;
  commentCount?: number;
  favoriteCount?: number;
  createdAt?: string;
}

/** 租房经历详情数据，正文、凭证状态和互动统计在详情页展示。 */
export interface RentalDetail extends RentalListing {
  experience: string;
  wechat: string;
}

/** 发布租房经历的输入。 */
export interface CreateRentalInput extends RentalStructuredLocation {
  title: string;
  price: string;
  location: string;
  landmark?: string;
  roomType: string;
  rentalType?: RentalType;
  stayStage: RentalStayStage;
  area?: string;
  commute?: string;
  experience: string;
  tags: string[];
  photos: string[];
  proofPhotos?: string[];
  truthPledge: boolean;
  wechat?: string;
}

/** 租房经历评论。 */
export interface RentalComment {
  id: string;
  rentalId: string;
  authorOpenid: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

/** 创建评论输入。 */
export interface CreateRentalCommentInput {
  content: string;
}

/** 举报租房经历输入。 */
export interface CreateRentalReportInput {
  reason: RentalReportReason;
  description: string;
  evidencePhotos?: string[];
}

/** 后台举报列表项。 */
export interface RentalReportListItem {
  id: string;
  rentalId: string;
  rentalTitle: string;
  reporterOpenid: string;
  reason: RentalReportReason;
  status: 'pending' | 'handled';
  createdAt: string;
}

/** 后台举报详情。 */
export interface RentalReportDetail extends RentalReportListItem {
  description: string;
  evidencePhotos: string[];
  proofPhotos: string[];
  handledBy?: string;
  handledNote?: string;
  handledAt?: string;
}

/** 后台处理举报输入。 */
export interface HandleRentalReportInput {
  postStatus: RentalPostStatus;
  handledNote: string;
}
```

- [ ] **Step 3: Run shared typecheck through workspace**

Run:

```bash
pnpm typecheck
```

Expected: Type errors are allowed at this point only if they point to consumers that must be updated in later tasks. No syntax errors in `packages/shared/src/contracts/rental.ts`.

- [ ] **Step 4: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 2: Database Schema for Proof, Comments, and Reports

**Files:**
- Modify: `apps/backend/schema.sql`

- [ ] **Step 1: Extend `rentals` table**

Add these columns to the `rentals` table definition after `location` and before `room_type` where possible:

```sql
  title VARCHAR(120) NOT NULL DEFAULT '',
  landmark VARCHAR(255),
  rental_type VARCHAR(32) NOT NULL DEFAULT 'shared',
  stay_stage VARCHAR(32) NOT NULL DEFAULT 'living',
  commute VARCHAR(255) NOT NULL DEFAULT '',
  proof_status VARCHAR(32) NOT NULL DEFAULT 'none',
  post_status VARCHAR(32) NOT NULL DEFAULT 'active',
  comment_count INT UNSIGNED NOT NULL DEFAULT 0,
  favorite_count INT UNSIGNED NOT NULL DEFAULT 0,
```

Add indexes:

```sql
  INDEX idx_post_status_created (post_status, created_at),
  INDEX idx_city_district (city, district),
```

- [ ] **Step 2: Add proof table**

Append:

```sql
CREATE TABLE IF NOT EXISTS rental_post_proofs (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  user_openid VARCHAR(64) NOT NULL,
  file_url VARCHAR(512) NOT NULL,
  file_type VARCHAR(32) NOT NULL DEFAULT 'image',
  masked_by_user TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_rental_id (rental_id),
  INDEX idx_user_openid (user_openid)
);
```

- [ ] **Step 3: Add comments table**

Append:

```sql
CREATE TABLE IF NOT EXISTS rental_post_comments (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  user_openid VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT NOW(),
  updated_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_rental_created (rental_id, created_at),
  INDEX idx_user_openid (user_openid)
);
```

- [ ] **Step 4: Add reports table**

Append:

```sql
CREATE TABLE IF NOT EXISTS rental_post_reports (
  id VARCHAR(36) PRIMARY KEY,
  rental_id VARCHAR(36) NOT NULL,
  reporter_openid VARCHAR(64) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  evidence_photos JSON,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  handled_by VARCHAR(64),
  handled_note TEXT,
  handled_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT NOW(),
  INDEX idx_rental_id (rental_id),
  INDEX idx_status_created (status, created_at),
  INDEX idx_reporter_openid (reporter_openid)
);
```

- [ ] **Step 5: Validate SQL by backend build**

Run:

```bash
pnpm --filter @rental-penpal/backend typecheck
```

Expected: PASS. SQL is not executed by typecheck, but this verifies no backend TypeScript was accidentally changed in this task.

- [ ] **Step 6: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 3: Backend Repository Mapping for Community Posts

**Files:**
- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`
- Modify: `apps/backend/src/modules/rentals/rental.service.ts`

- [ ] **Step 1: Update row interfaces**

In `rental.repository.ts`, extend `RentalRow` with:

```ts
  title: string | null;
  landmark: string | null;
  rental_type: string | null;
  stay_stage: string | null;
  commute: string | null;
  proof_status: string | null;
  post_status: string | null;
  comment_count: number | null;
  favorite_count: number | null;
  created_at: Date | string | null;
```

- [ ] **Step 2: Add safe enum mappers**

Add helper functions near `mapStatus`:

```ts
function mapPostStatus(value: string | null): RentalPostStatus {
  if (value === 'pending_review' || value === 'hidden' || value === 'rejected') return value;
  return 'active';
}

function mapProofStatus(value: string | null): RentalProofStatus {
  return value === 'submitted' ? 'submitted' : 'none';
}

function mapRentalType(value: string | null): RentalType | undefined {
  if (value === 'whole' || value === 'shared' || value === 'single' || value === 'sublet' || value === 'short') {
    return value;
  }
  return undefined;
}

function mapStayStage(value: string | null): RentalStayStage | undefined {
  if (value === 'living' || value === 'moved_out' || value === 'viewing' || value === 'subletting') return value;
  return undefined;
}
```

Import the needed types from `@shared/contracts/rental`.

- [ ] **Step 3: Update `mapRentalRow`**

Change the returned object so title and community fields are mapped:

```ts
return {
  id: row.id,
  title: row.title?.trim() || `${row.room_type} / ${row.location}`,
  contentPreview: undefined,
  location: row.location,
  province: row.province ?? undefined,
  city: row.city ?? undefined,
  district: row.district ?? undefined,
  address: row.address ?? undefined,
  landmark: row.landmark ?? undefined,
  latitude: toNumber(row.latitude),
  longitude: toNumber(row.longitude),
  price: row.price,
  area: row.area,
  roomType: row.room_type,
  rentalType: mapRentalType(row.rental_type),
  stayStage: mapStayStage(row.stay_stage),
  commute: row.commute ?? undefined,
  tags: safeParseArray(row.tags),
  photos: safeParseArray(row.photos),
  status: mapStatus(row.status),
  postStatus: mapPostStatus(row.post_status),
  proofStatus: mapProofStatus(row.proof_status),
  commentCount: row.comment_count ?? 0,
  favoriteCount: row.favorite_count ?? 0,
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined
};
```

- [ ] **Step 4: Update select columns**

Append these columns in `getSelectColumns`:

```ts
columns.push(
  'title',
  'landmark',
  'rental_type',
  'stay_stage',
  'commute',
  'proof_status',
  'post_status',
  'comment_count',
  'favorite_count',
  'created_at'
);
```

- [ ] **Step 5: Update insert statement**

In `buildInsertStatement`, add:

```ts
columns.push('title', 'landmark', 'rental_type', 'stay_stage', 'commute', 'proof_status', 'post_status');
values.push(
  input.title,
  input.landmark ?? input.address ?? null,
  input.rentalType ?? 'shared',
  input.stayStage,
  input.commute ?? '',
  input.proofPhotos?.length ? 'submitted' : 'none',
  'active'
);
```

Keep existing `room_type`, `area`, `experience`, `tags`, `wechat`, `photos`, `status`, `created_at`, and `updated_at` insertion.

- [ ] **Step 6: Add proof insert helper**

Add:

```ts
export async function createRentalProofs(userOpenid: string, rentalId: string, proofPhotos: string[] = []): Promise<void> {
  if (proofPhotos.length === 0) return;
  const values = proofPhotos.map((url) => [generateId(), rentalId, userOpenid, url]);
  await pool.query(
    'INSERT INTO rental_post_proofs (id, rental_id, user_openid, file_url, created_at) VALUES ?',
    [values.map(([id, postId, openid, fileUrl]) => [id, postId, openid, fileUrl, new Date()])]
  );
}
```

- [ ] **Step 7: Call proof helper from service**

In `rental.service.ts`, update `publishRental`:

```ts
export async function publishRental(userOpenid: string, input: CreateRentalInput): Promise<CreateRentalResponse> {
  const result = await createRental(userOpenid, input);
  await createRentalProofs(userOpenid, result.id, input.proofPhotos);
  return result;
}
```

- [ ] **Step 8: Run backend typecheck**

Run:

```bash
pnpm --filter @rental-penpal/backend typecheck
```

Expected: PASS.

- [ ] **Step 9: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 4: Backend Publish Validation and Listing Query

**Files:**
- Modify: `apps/backend/src/app/api/rentals/route.ts`
- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`

- [ ] **Step 1: Validate community publish fields**

In `apps/backend/src/app/api/rentals/route.ts`, replace the current POST validation block with:

```ts
const body = (await request.json()) as CreateRentalInput;
const hasCompleteRegion = Boolean(body.province && body.city && body.district);
const title = body.title?.trim();
const experience = body.experience?.trim();
const hasPhoto = Array.isArray(body.photos) && body.photos.length > 0;

if (!title) return fail(BizCode.INVALID_PARAMS, '请填写经历标题');
if (!experience) return fail(BizCode.INVALID_PARAMS, '请填写真实租房经历');
if (!hasPhoto) return fail(BizCode.INVALID_PARAMS, '请至少上传 1 张图片');
if (!body.price) return fail(BizCode.INVALID_PARAMS, '请填写租金参考');
if (!hasCompleteRegion) return fail(BizCode.INVALID_PARAMS, '请选择城市和区域');
if (!(body.landmark || body.address)) return fail(BizCode.INVALID_PARAMS, '请填写小区或地标');
if (!body.roomType) return fail(BizCode.INVALID_PARAMS, '请选择户型');
if (!body.stayStage) return fail(BizCode.INVALID_PARAMS, '请选择租住阶段');
if (!body.truthPledge) return fail(BizCode.INVALID_PARAMS, '请确认内容来自真实租房经历');
```

- [ ] **Step 2: Build community location label**

Keep the existing `location` fallback, but prefer `landmark`:

```ts
const location =
  body.location?.trim() ||
  buildRentalLocationLabel({
    province: body.province,
    city: body.city,
    district: body.district,
    address: body.landmark || body.address
  });
```

- [ ] **Step 3: Filter hidden and rejected posts from public list**

In `listRentals`, add:

```ts
whereConditions.push("COALESCE(post_status, 'active') = 'active'");
```

Keep `status = 1` for compatibility.

- [ ] **Step 4: Search title and experience**

Replace keyword condition with:

```ts
if (query.keyword) {
  whereConditions.push('(location LIKE ? OR title LIKE ? OR experience LIKE ?)');
  whereParams.push(`%${query.keyword}%`, `%${query.keyword}%`, `%${query.keyword}%`);
}
```

- [ ] **Step 5: Run backend typecheck**

Run:

```bash
pnpm --filter @rental-penpal/backend typecheck
```

Expected: PASS.

- [ ] **Step 6: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 5: Comments API

**Files:**
- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`
- Modify: `apps/backend/src/modules/rentals/rental.service.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/comments/route.ts`
- Create: `apps/backend/src/app/api/rental-comments/[id]/route.ts`

- [ ] **Step 1: Add comment repository helpers**

Add to `rental.repository.ts`:

```ts
interface RentalCommentRow extends RowDataPacket {
  id: string;
  rental_id: string;
  user_openid: string;
  nickname: string | null;
  avatar_url: string | null;
  content: string;
  created_at: Date | string;
}

export async function listRentalComments(rentalId: string): Promise<RentalComment[]> {
  const [rows] = await pool.execute<RentalCommentRow[]>(
    `SELECT c.id, c.rental_id, c.user_openid, u.nickname, u.avatar_url, c.content, c.created_at
     FROM rental_post_comments c
     LEFT JOIN users u ON u.openid = c.user_openid
     WHERE c.rental_id = ? AND c.status = 'active'
     ORDER BY c.created_at ASC`,
    [rentalId]
  );
  return rows.map((row) => ({
    id: row.id,
    rentalId: row.rental_id,
    authorOpenid: row.user_openid,
    authorName: row.nickname || '租友',
    authorAvatar: row.avatar_url || '',
    content: row.content,
    createdAt: new Date(row.created_at).toISOString()
  }));
}

export async function createRentalComment(userOpenid: string, rentalId: string, content: string): Promise<RentalComment> {
  const id = generateId();
  await pool.execute(
    `INSERT INTO rental_post_comments (id, rental_id, user_openid, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, NOW(), NOW())`,
    [id, rentalId, userOpenid, content]
  );
  await pool.execute('UPDATE rentals SET comment_count = comment_count + 1 WHERE id = ?', [rentalId]);
  const comments = await listRentalComments(rentalId);
  return comments.find((comment) => comment.id === id)!;
}

export async function deleteRentalComment(userOpenid: string, commentId: string): Promise<boolean> {
  const [result] = await pool.execute<import('mysql2/promise').ResultSetHeader>(
    `UPDATE rental_post_comments
     SET status = 'deleted', updated_at = NOW()
     WHERE id = ? AND user_openid = ? AND status = 'active'`,
    [commentId, userOpenid]
  );
  return result.affectedRows > 0;
}
```

- [ ] **Step 2: Add service exports**

In `rental.service.ts`, export:

```ts
export async function readRentalComments(rentalId: string): Promise<RentalComment[]> {
  return listRentalComments(rentalId);
}

export async function publishRentalComment(userOpenid: string, rentalId: string, content: string): Promise<RentalComment> {
  return createRentalComment(userOpenid, rentalId, content.trim());
}

export async function removeRentalComment(userOpenid: string, commentId: string): Promise<boolean> {
  return deleteRentalComment(userOpenid, commentId);
}
```

- [ ] **Step 3: Create comments route**

Create `apps/backend/src/app/api/rentals/[id]/comments/route.ts`:

```ts
import type { CreateRentalCommentInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { publishRentalComment, readRentalComments } from '@/modules/rentals/rental.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return ok(await readRentalComments(id));
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const body = (await request.json()) as CreateRentalCommentInput;
    const content = body.content?.trim();
    if (!content) return fail(BizCode.INVALID_PARAMS, '请填写评论内容');
    if (content.length > 300) return fail(BizCode.INVALID_PARAMS, '评论不能超过 300 字');

    return ok(await publishRentalComment(payload.openid, id, content));
  } catch (error) {
    return handleError(error);
  }
}
```

- [ ] **Step 4: Create delete comment route**

Create `apps/backend/src/app/api/rental-comments/[id]/route.ts`:

```ts
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { removeRentalComment } from '@/modules/rentals/rental.service';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const removed = await removeRentalComment(payload.openid, id);
    if (!removed) return fail(BizCode.NOT_FOUND, '评论不存在或无权删除');
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
```

- [ ] **Step 5: Run backend typecheck**

Run:

```bash
pnpm --filter @rental-penpal/backend typecheck
```

Expected: PASS.

- [ ] **Step 6: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 6: Frontend Publish Form as Rental Experience Note

**Files:**
- Create: `apps/frontend/src/pages/share/share-options.ts`
- Create: `apps/frontend/src/pages/share/share-validation.ts`
- Modify: `apps/frontend/src/shared/api/services.ts`
- Modify: `apps/frontend/src/pages/share/index.tsx`
- Modify: `apps/frontend/src/pages/share/index.scss`

- [ ] **Step 1: Add form options**

Create `apps/frontend/src/pages/share/share-options.ts`:

```ts
import type { RentalStayStage, RentalType } from '@shared/contracts/rental';

export const EXPERIENCE_TAGS = ['避坑', '推荐', '通勤友好', '隔音差', '采光好', '押金争议', '室友友好', '中介谨慎'];

export const RENTAL_TYPES: Array<{ label: string; value: RentalType }> = [
  { label: '整租', value: 'whole' },
  { label: '合租', value: 'shared' },
  { label: '单间', value: 'single' },
  { label: '转租', value: 'sublet' },
  { label: '短租', value: 'short' }
];

export const STAY_STAGES: Array<{ label: string; value: RentalStayStage }> = [
  { label: '正在住', value: 'living' },
  { label: '已搬离', value: 'moved_out' },
  { label: '看房经历', value: 'viewing' },
  { label: '转租经历', value: 'subletting' }
];
```

- [ ] **Step 2: Add validation helper**

Create `apps/frontend/src/pages/share/share-validation.ts`:

```ts
import type { RentalRegionInput } from '@shared/contracts/location';
import type { RentalStayStage } from '@shared/contracts/rental';

export interface ShareExperienceDraft {
  title: string;
  experience: string;
  photos: string[];
  price: string;
  region: RentalRegionInput | null;
  landmark: string;
  roomTypeIndex: number;
  stayStage?: RentalStayStage;
  truthPledge: boolean;
}

export function validateShareExperienceDraft(draft: ShareExperienceDraft): string | null {
  if (!draft.title.trim()) return '请填写经历标题';
  if (!draft.experience.trim()) return '请填写真实租房经历';
  if (draft.photos.length === 0) return '请至少上传 1 张图片';
  if (!draft.price.trim()) return '请填写租金参考';
  if (!draft.region) return '请选择城市和区域';
  if (!draft.landmark.trim()) return '请填写小区或地标';
  if (draft.roomTypeIndex < 0) return '请选择户型';
  if (!draft.stayStage) return '请选择租住阶段';
  if (!draft.truthPledge) return '请确认内容来自真实租房经历';
  return null;
}
```

- [ ] **Step 3: Manual validation cases for user testing**

After implementation, ask the user to manually verify these publish-page cases in the mini program:

- Missing title shows `请填写经历标题`.
- Missing正文 shows `请填写真实租房经历`.
- No photo shows `请至少上传 1 张图片`.
- Missing city/area shows `请选择城市和区域`.
- Missing landmark shows `请填写小区或地标`.
- Missing truth pledge shows `请确认内容来自真实租房经历`.

- [ ] **Step 4: Keep API call compatible**

In `apps/frontend/src/shared/api/services.ts`, keep `createRental(input: CreateRentalInput)` unchanged so the page can submit the expanded input.

- [ ] **Step 5: Update publish page state**

In `apps/frontend/src/pages/share/index.tsx`, add state:

```ts
const [title, setTitle] = useState('');
const [landmark, setLandmark] = useState('');
const [rentalTypeIndex, setRentalTypeIndex] = useState(1);
const [stayStageIndex, setStayStageIndex] = useState(-1);
const [commute, setCommute] = useState('');
const [proofPhotos, setProofPhotos] = useState<string[]>([]);
const [truthPledge, setTruthPledge] = useState(false);
```

Import:

```ts
import { EXPERIENCE_TAGS, RENTAL_TYPES, STAY_STAGES } from './share-options';
import { validateShareExperienceDraft } from './share-validation';
```

- [ ] **Step 6: Replace submit validation**

In `handleSubmit`, call:

```ts
const validationError = validateShareExperienceDraft({
  title,
  experience,
  photos,
  price,
  region,
  landmark,
  roomTypeIndex,
  stayStage: stayStageIndex >= 0 ? STAY_STAGES[stayStageIndex].value : undefined,
  truthPledge
});
if (validationError) {
  void Taro.showToast({ title: validationError, icon: 'none' });
  return;
}
```

- [ ] **Step 7: Submit community input**

Update `createRental` payload:

```ts
await createRental({
  title,
  price,
  location: `${buildDisplayLocation(region!)} ${landmark}`.trim(),
  province: region!.province,
  city: region!.city,
  district: region!.district,
  landmark,
  roomType: ROOM_TYPES[roomTypeIndex],
  rentalType: RENTAL_TYPES[rentalTypeIndex].value,
  stayStage: STAY_STAGES[stayStageIndex].value,
  area: area || undefined,
  commute: commute || undefined,
  experience,
  tags: selectedTags,
  photos,
  proofPhotos,
  truthPledge
});
```

- [ ] **Step 8: Update visible page copy and structure**

Change the form sections to:

- `真实经历`
- `租房参考`
- `真实性凭证`
- `发布承诺`

Remove the WeChat contact section from the primary form. Add a `PhotoUploader` for proof photos with helper text: `凭证仅供平台复核，不会公开展示。上传前请打码合同号、手机号、身份证等隐私信息。`

- [ ] **Step 9: Run frontend typecheck**

Run:

```bash
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS.

- [ ] **Step 10: Record changed files for the later unified commit**

Run `git status --short` and keep these files in the final unified commit:

```bash
git status --short
```

---

## Task 7: Note-Style List and Detail Pages

**Files:**
- Modify: `apps/frontend/src/pages/find/components/RentalCard/index.tsx`
- Modify: `apps/frontend/src/pages/find/components/RentalCard/index.scss`
- Modify: `apps/frontend/src/pages/find/index.tsx`
- Modify: `apps/frontend/src/pages/rental-detail/index.tsx`
- Modify: `apps/frontend/src/pages/rental-detail/index.scss`
- Modify: `apps/frontend/src/pages/rental-list/index.tsx`
- Modify: `apps/frontend/src/pages/rental-list/index.config.ts`

- [ ] **Step 1: Update card metadata**

In `RentalCard`, derive community metadata:

```ts
const displayTags = item.tags.slice(0, 3);
const regionText = [item.city, item.district].filter(Boolean).join(' ');
const landmarkText = item.landmark || item.address || item.location;
const interactionText = `${item.commentCount ?? 0} 评论 · ${item.favoriteCount ?? 0} 收藏`;
const hasProof = item.proofStatus === 'submitted';
```

Render title, region, landmark, tags, proof badge, rent reference, and interaction text. Do not render contact or broker-like wording.

- [ ] **Step 2: Rename find page empty and footer copy**

In `find/index.tsx`, replace user-facing list copy with:

- Loading: `正在加载租房经历...`
- Empty: keep `EmptyState`, but update that component in a later focused task if it still says house listing.
- Footer: `已经看完这些经历了`

- [ ] **Step 3: Update detail page information architecture**

In `rental-detail/index.tsx`, render sections in this order:

1. Gallery.
2. Title and author/time metadata.
3. Proof badge with text `已提交凭证，仅供平台复核`.
4. Experience正文.
5. Tags.
6. `租房参考` module.
7. Comments module placeholder wired in Task 8.
8. Bottom actions: favorite, comment scroll, report.

Remove the primary WeChat copy action from the main CTA.

- [ ] **Step 4: Update mine/favorites/history copy**

In `rental-list/index.tsx`, use:

```ts
const TITLES: Record<ListType, string> = {
  mine: '我的分享',
  favorites: '我的收藏',
  history: '浏览历史'
};

const EMPTY_TEXTS: Record<ListType, string> = {
  mine: '还没有分享租房经历',
  favorites: '还没有收藏租房经历',
  history: '还没有浏览记录'
};
```

- [ ] **Step 5: Run frontend typecheck and build**

Run:

```bash
pnpm --filter @rental-penpal/frontend typecheck
pnpm build:frontend
```

Expected: PASS.

- [ ] **Step 6: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 8: Frontend Comments

**Files:**
- Modify: `apps/frontend/src/shared/api/services.ts`
- Create: `apps/frontend/src/pages/rental-detail/components/CommentSection/index.tsx`
- Create: `apps/frontend/src/pages/rental-detail/components/CommentSection/index.scss`
- Modify: `apps/frontend/src/pages/rental-detail/index.tsx`
- Modify: `apps/frontend/src/pages/rental-detail/index.scss`

- [ ] **Step 1: Add comment API services**

In `services.ts`, add:

```ts
import type { CreateRentalCommentInput, RentalComment } from '@shared/contracts/rental';

export function fetchRentalComments(id: string) {
  return httpRequest<RentalComment[]>(`/rentals/${id}/comments`);
}

export function createRentalComment(id: string, content: string) {
  return httpRequest<RentalComment, CreateRentalCommentInput>(`/rentals/${id}/comments`, {
    method: 'POST',
    body: { content }
  });
}

export function deleteRentalComment(id: string) {
  return httpRequest<null>(`/rental-comments/${id}`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Create comment component**

Create `apps/frontend/src/pages/rental-detail/components/CommentSection/index.tsx`:

```tsx
import type { RentalComment } from '@shared/contracts/rental';
import { Button, Input, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useState } from 'react';

import { createRentalComment, deleteRentalComment, fetchRentalComments } from '@/shared/api/services';

import './index.scss';

interface Props {
  rentalId: string;
}

export function CommentSection({ rentalId }: Props) {
  const [comments, setComments] = useState<RentalComment[]>([]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchRentalComments(rentalId).then(setComments);
  }, [rentalId]);

  async function handleSubmit() {
    const value = content.trim();
    if (!value) {
      void Taro.showToast({ title: '请填写评论内容', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      const next = await createRentalComment(rentalId, value);
      setComments((prev) => [...prev, next]);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    await deleteRentalComment(commentId);
    setComments((prev) => prev.filter((item) => item.id !== commentId));
  }

  return (
    <View className="comment-section">
      <Text className="comment-section__title">评论讨论</Text>
      <View className="comment-section__composer">
        <Input
          className="comment-section__input"
          value={content}
          placeholder="追问细节，或补充你的租房经验"
          onInput={(event) => setContent(event.detail.value)}
        />
        <Button className="comment-section__button" loading={submitting} onClick={handleSubmit}>
          发布
        </Button>
      </View>
      <View className="comment-section__list">
        {comments.map((comment) => (
          <View key={comment.id} className="comment-section__item">
            <Text className="comment-section__author">{comment.authorName}</Text>
            <Text className="comment-section__content">{comment.content}</Text>
            <Text className="comment-section__delete" onClick={() => void handleDelete(comment.id)}>
              删除
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Wire comments into detail**

In `rental-detail/index.tsx`, import and render:

```tsx
import { CommentSection } from './components/CommentSection';

{rental && <CommentSection rentalId={rental.id} />}
```

- [ ] **Step 4: Run frontend typecheck**

Run:

```bash
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS.

- [ ] **Step 5: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 9: Reports API and Frontend Report Entry

**Files:**
- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`
- Modify: `apps/backend/src/modules/rentals/rental.service.ts`
- Create: `apps/backend/src/app/api/rentals/[id]/reports/route.ts`
- Modify: `apps/frontend/src/shared/api/services.ts`
- Create: `apps/frontend/src/pages/rental-detail/components/ReportPanel/index.tsx`
- Create: `apps/frontend/src/pages/rental-detail/components/ReportPanel/index.scss`
- Modify: `apps/frontend/src/pages/rental-detail/index.tsx`

- [ ] **Step 1: Add report repository helper**

Add to `rental.repository.ts`:

```ts
export async function createRentalReport(
  reporterOpenid: string,
  rentalId: string,
  input: CreateRentalReportInput
): Promise<{ id: string }> {
  const id = generateId();
  await pool.execute(
    `INSERT INTO rental_post_reports
      (id, rental_id, reporter_openid, reason, description, evidence_photos, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [id, rentalId, reporterOpenid, input.reason, input.description, JSON.stringify(input.evidencePhotos ?? [])]
  );
  await pool.execute("UPDATE rentals SET post_status = 'pending_review' WHERE id = ? AND post_status = 'active'", [
    rentalId
  ]);
  return { id };
}
```

- [ ] **Step 2: Add service helper**

In `rental.service.ts`:

```ts
export async function reportRental(
  reporterOpenid: string,
  rentalId: string,
  input: CreateRentalReportInput
): Promise<{ id: string }> {
  return createRentalReport(reporterOpenid, rentalId, input);
}
```

- [ ] **Step 3: Create reports route**

Create `apps/backend/src/app/api/rentals/[id]/reports/route.ts`:

```ts
import type { CreateRentalReportInput, RentalReportReason } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { reportRental } from '@/modules/rentals/rental.service';

const REASONS: RentalReportReason[] = [
  'fake_rent_or_address',
  'fake_experience',
  'agent_disguise',
  'phishing',
  'privacy_leak',
  'harassment',
  'other'
];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id } = await params;
    const body = (await request.json()) as CreateRentalReportInput;
    if (!REASONS.includes(body.reason)) return fail(BizCode.INVALID_PARAMS, '请选择举报原因');
    if (!body.description?.trim()) return fail(BizCode.INVALID_PARAMS, '请填写举报说明');

    return ok(await reportRental(payload.openid, id, body));
  } catch (error) {
    return handleError(error);
  }
}
```

- [ ] **Step 4: Add frontend report service**

In `services.ts`:

```ts
import type { CreateRentalReportInput } from '@shared/contracts/rental';

export function createRentalReport(id: string, input: CreateRentalReportInput) {
  return httpRequest<{ id: string }, CreateRentalReportInput>(`/rentals/${id}/reports`, {
    method: 'POST',
    body: input
  });
}
```

- [ ] **Step 5: Create report panel**

Create `apps/frontend/src/pages/rental-detail/components/ReportPanel/index.tsx` with a modal-like panel containing reason buttons:

```tsx
import type { RentalReportReason } from '@shared/contracts/rental';
import { Button, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';

import { createRentalReport } from '@/shared/api/services';

import './index.scss';

const REASON_OPTIONS: Array<{ label: string; value: RentalReportReason }> = [
  { label: '虚假租金 / 地址', value: 'fake_rent_or_address' },
  { label: '冒充真实经历', value: 'fake_experience' },
  { label: '中介伪装', value: 'agent_disguise' },
  { label: '钓鱼引流', value: 'phishing' },
  { label: '隐私泄露', value: 'privacy_leak' },
  { label: '恶意攻击', value: 'harassment' },
  { label: '其他', value: 'other' }
];

interface Props {
  rentalId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportPanel({ rentalId, visible, onClose }: Props) {
  const [reason, setReason] = useState<RentalReportReason>('fake_rent_or_address');
  const [description, setDescription] = useState('');

  if (!visible) return null;

  async function handleSubmit() {
    if (!description.trim()) {
      void Taro.showToast({ title: '请填写举报说明', icon: 'none' });
      return;
    }
    await createRentalReport(rentalId, { reason, description });
    void Taro.showToast({ title: '举报已提交', icon: 'success' });
    onClose();
  }

  return (
    <View className="report-panel">
      <View className="report-panel__body">
        <Text className="report-panel__title">举报租房经历</Text>
        <View className="report-panel__reasons">
          {REASON_OPTIONS.map((item) => (
            <View
              key={item.value}
              className={`report-panel__reason${reason === item.value ? ' report-panel__reason--active' : ''}`}
              onClick={() => setReason(item.value)}
            >
              <Text>{item.label}</Text>
            </View>
          ))}
        </View>
        <Textarea
          className="report-panel__textarea"
          value={description}
          placeholder="说明你发现的问题，便于平台复核"
          onInput={(event) => setDescription(event.detail.value)}
        />
        <View className="report-panel__actions">
          <Button onClick={onClose}>取消</Button>
          <Button onClick={handleSubmit}>提交</Button>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 6: Wire report panel into detail**

In `rental-detail/index.tsx`, keep `const [reportVisible, setReportVisible] = useState(false);`, render `ReportPanel`, and add a report button with `onClick={() => setReportVisible(true)}`.

- [ ] **Step 7: Run checks**

Run:

```bash
pnpm --filter @rental-penpal/backend typecheck
pnpm --filter @rental-penpal/frontend typecheck
```

Expected: PASS.

- [ ] **Step 8: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 10: Admin Report Handling APIs

**Files:**
- Modify: `apps/backend/src/modules/rentals/rental.repository.ts`
- Modify: `apps/backend/src/modules/rentals/rental.service.ts`
- Create: `apps/backend/src/app/api/admin/rental-post-reports/route.ts`
- Create: `apps/backend/src/app/api/admin/rental-post-reports/[id]/route.ts`
- Create: `apps/backend/src/app/api/admin/rental-post-reports/[id]/handle/route.ts`

- [ ] **Step 1: Add admin repository helpers**

Add list, detail, and handle helpers:

```ts
export async function listRentalReports(): Promise<RentalReportListItem[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT rp.id, rp.rental_id, r.title, rp.reporter_openid, rp.reason, rp.status, rp.created_at
     FROM rental_post_reports rp
     INNER JOIN rentals r ON r.id = rp.rental_id
     ORDER BY rp.created_at DESC
     LIMIT 100`
  );
  return rows.map((row) => ({
    id: String(row.id),
    rentalId: String(row.rental_id),
    rentalTitle: String(row.title || '未命名租房经历'),
    reporterOpenid: String(row.reporter_openid),
    reason: row.reason as RentalReportReason,
    status: row.status === 'handled' ? 'handled' : 'pending',
    createdAt: new Date(row.created_at as Date | string).toISOString()
  }));
}

export async function handleRentalReport(
  reportId: string,
  adminOpenid: string,
  input: HandleRentalReportInput
): Promise<boolean> {
  const [reports] = await pool.execute<RowDataPacket[]>('SELECT rental_id FROM rental_post_reports WHERE id = ?', [
    reportId
  ]);
  if (reports.length === 0) return false;
  const rentalId = String(reports[0].rental_id);
  await pool.execute('UPDATE rentals SET post_status = ?, updated_at = NOW() WHERE id = ?', [input.postStatus, rentalId]);
  await pool.execute(
    `UPDATE rental_post_reports
     SET status = 'handled', handled_by = ?, handled_note = ?, handled_at = NOW()
     WHERE id = ?`,
    [adminOpenid, input.handledNote, reportId]
  );
  return true;
}
```

- [ ] **Step 2: Add admin service exports**

In `rental.service.ts`, export:

```ts
export async function readRentalReports(): Promise<RentalReportListItem[]> {
  return listRentalReports();
}

export async function resolveRentalReport(
  reportId: string,
  adminOpenid: string,
  input: HandleRentalReportInput
): Promise<boolean> {
  return handleRentalReport(reportId, adminOpenid, input);
}
```

- [ ] **Step 3: Create admin list route**

Create `apps/backend/src/app/api/admin/rental-post-reports/route.ts`:

```ts
import { handleError, ok } from '@/lib/response';
import { readRentalReports } from '@/modules/rentals/rental.service';

export async function GET() {
  try {
    return ok(await readRentalReports());
  } catch (error) {
    return handleError(error);
  }
}
```

- [ ] **Step 4: Create admin handle route**

Create `apps/backend/src/app/api/admin/rental-post-reports/[id]/handle/route.ts`:

```ts
import type { HandleRentalReportInput } from '@shared/contracts/rental';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { resolveRentalReport } from '@/modules/rentals/rental.service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);
    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const body = (await request.json()) as HandleRentalReportInput;
    if (!body.handledNote?.trim()) return fail(BizCode.INVALID_PARAMS, '请填写处理备注');

    const { id } = await params;
    const handled = await resolveRentalReport(id, payload.openid, body);
    if (!handled) return fail(BizCode.NOT_FOUND, '举报不存在');
    return ok(null);
  } catch (error) {
    return handleError(error);
  }
}
```

- [ ] **Step 5: Run backend checks**

Run:

```bash
pnpm --filter @rental-penpal/backend typecheck
pnpm build:backend
```

Expected: PASS.

- [ ] **Step 6: Record changed files for the later unified commit**

```bash
git status --short
```

---

## Task 11: Final Verification and Copy Audit

**Files:**
- Modify if needed after search:
  - `apps/frontend/src/pages/**`
  - `apps/backend/src/modules/rentals/**`
  - `packages/shared/src/contracts/rental.ts`

- [ ] **Step 1: Search broker-style copy**

Run:

```bash
rg "房源|联系|微信|看房|中介" apps/frontend/src packages/shared/src apps/backend/src
```

Expected: Remaining matches are either historical code names, acceptable backend identifiers, or intentional report reasons such as `中介伪装`. User-facing copy should use “租房经历”“分享”“评论”“举报”“租房参考”.

- [ ] **Step 2: Search map/geolocation usage**

Run:

```bash
rg "chooseLocation|getLocation|Map|latitude|longitude" apps/frontend/src
```

Expected: No frontend location permission or map selection usage is required for publishing. Existing backend latitude/longitude compatibility fields may remain unused.

- [ ] **Step 3: Run full verification**

Run:

```bash
pnpm --filter @rental-penpal/frontend typecheck
pnpm --filter @rental-penpal/backend typecheck
pnpm build:frontend
pnpm build:backend
```

Expected: PASS.

- [ ] **Step 4: Leave changes for the later unified commit**

If Step 1 or Step 2 required edits, run:

```bash
git status --short
```

Do not create a commit in this task. The user will approve behavior through manual testing before the unified commit.

---

## Self-Review

### Spec Coverage

- “分享租房经历”定位：Task 6 and Task 7.
- 必填标题、正文、城市区域、小区或地标、租金、图片、租住阶段：Task 1, Task 4, Task 6.
- 可选凭证且不公开：Task 1, Task 2, Task 3, Task 6, Task 10.
- 笔记流列表：Task 7.
- 详情页突出经历正文和租房参考：Task 7.
- 公开评论区：Task 5 and Task 8.
- 租房专项举报：Task 9.
- 后台处理举报和内容状态：Task 10.
- 不使用地图选点或地理位置权限：Task 11.

### Placeholder Scan

The plan avoids unresolved placeholder wording. Steps include exact file paths, concrete code blocks for new modules, exact commands, and expected outcomes.

### Type Consistency

The plan consistently uses `RentalListing`, `RentalDetail`, `CreateRentalInput`, `RentalComment`, `CreateRentalReportInput`, `RentalReportReason`, `RentalPostStatus`, `RentalProofStatus`, `RentalStayStage`, and `RentalType` from `@shared/contracts/rental`.
