import { HOUSE_MODULE_IDS, type AttachSpacePhotoInput, type HouseModuleId } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { addRentalSpacePhoto, isEvidenceVisibility } from '@/modules/rentals/rental-draft.service';

interface RouteContext {
  params: Promise<{ id: string; module: string }>;
}

/** 将已完成上传的图片资产绑定到本人草稿点位。 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const payload = token ? await verifyToken(token) : null;
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id, module: rawModule } = await context.params;
    if (!HOUSE_MODULE_IDS.includes(rawModule as HouseModuleId)) {
      return fail(BizCode.INVALID_PARAMS, '未知的空间点位');
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.assetId !== 'string' || !body.assetId.trim()) {
      return fail(BizCode.INVALID_PARAMS, '缺少图片资产');
    }
    if (typeof body.captureChallengeId !== 'string' || !body.captureChallengeId.trim()) {
      return fail(BizCode.INVALID_PARAMS, '缺少有效的拍摄任务');
    }
    if (!isEvidenceVisibility(body.visibility)) {
      return fail(BizCode.INVALID_PARAMS, '图片可见性不正确');
    }
    if (body.captureChallengeId !== undefined && typeof body.captureChallengeId !== 'string') {
      return fail(BizCode.INVALID_PARAMS, '拍摄任务格式不正确');
    }
    if (body.capturedAt !== undefined && typeof body.capturedAt !== 'string') {
      return fail(BizCode.INVALID_PARAMS, '拍摄时间格式不正确');
    }

    const input: AttachSpacePhotoInput = {
      assetId: body.assetId.trim(),
      visibility: body.visibility,
      captureChallengeId: body.captureChallengeId.trim(),
      capturedAt: body.capturedAt as string | undefined
    };
    return ok(await addRentalSpacePhoto(payload.openid, id, rawModule as HouseModuleId, input));
  } catch (error) {
    return handleError(error);
  }
}
