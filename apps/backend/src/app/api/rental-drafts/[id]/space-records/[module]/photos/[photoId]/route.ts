import { HOUSE_MODULE_IDS, type HouseModuleId } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import {
  changeRentalSpacePhoto,
  isEvidenceVisibility,
  removeRentalSpacePhoto
} from '@/modules/rentals/rental-draft.service';

interface RouteContext {
  params: Promise<{ id: string; module: string; photoId: string }>;
}

/** 统一解析照片修改和删除接口所需的用户、路由参数与模块枚举。 */
async function readContext(request: Request, context: RouteContext) {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = token ? await verifyToken(token) : null;
  const params = await context.params;
  const module = HOUSE_MODULE_IDS.includes(params.module as HouseModuleId)
    ? (params.module as HouseModuleId)
    : null;
  return { payload, params, module };
}

/** 修改本人草稿照片的公开或仅核验状态。 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { payload, params, module } = await readContext(request, context);
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    if (!module) return fail(BizCode.INVALID_PARAMS, '未知的空间点位');

    const body = (await request.json()) as Record<string, unknown>;
    if (!isEvidenceVisibility(body.visibility)) {
      return fail(BizCode.INVALID_PARAMS, '图片可见性不正确');
    }
    return ok(
      await changeRentalSpacePhoto(payload.openid, params.id, module, params.photoId, {
        visibility: body.visibility
      })
    );
  } catch (error) {
    return handleError(error);
  }
}

/** 删除本人草稿点位中的照片绑定。 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { payload, params, module } = await readContext(request, context);
    if (!payload) return fail(BizCode.UNAUTHORIZED);
    if (!module) return fail(BizCode.INVALID_PARAMS, '未知的空间点位');
    return ok(await removeRentalSpacePhoto(payload.openid, params.id, module, params.photoId));
  } catch (error) {
    return handleError(error);
  }
}
