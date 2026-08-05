import {
  HOUSE_MODULE_IDS,
  type HouseModuleId,
  type RentalEventPeriod,
  type SpaceSceneAnswer,
  type UpsertSpaceRecordInput
} from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { readRentalSpaceRecord, saveRentalSpaceRecord } from '@/modules/rentals/rental-draft.service';

interface RouteContext {
  params: Promise<{ id: string; module: string }>;
}

/** 将路由字符串收敛为六个允许的空间枚举。 */
function toModule(value: string): HouseModuleId | null {
  return HOUSE_MODULE_IDS.includes(value as HouseModuleId) ? (value as HouseModuleId) : null;
}

/** 校验具体事件的时段枚举。 */
function toEventPeriod(value: unknown): RentalEventPeriod | undefined {
  if (value === 'MORNING' || value === 'DAYTIME' || value === 'EVENING' || value === 'LATE_NIGHT') return value;
  return undefined;
}

/** 校验场景答案数组的基础结构，业务题目 ID 在 service 层继续过滤。 */
function toSceneAnswers(value: unknown): SpaceSceneAnswer[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const answers = value.filter(
    (answer): answer is SpaceSceneAnswer =>
      typeof answer === 'object' &&
      answer !== null &&
      typeof (answer as SpaceSceneAnswer).promptId === 'string' &&
      'value' in answer
  );
  return answers.length === value.length ? answers : undefined;
}

/** 从 Bearer Token 解析当前用户。 */
async function authenticate(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return token ? verifyToken(token) : null;
}

/** 读取本人草稿中的指定点位、题目配置和当前答案。 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const payload = await authenticate(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id, module: rawModule } = await context.params;
    const module = toModule(rawModule);
    if (!module) return fail(BizCode.INVALID_PARAMS, '未知的空间点位');
    return ok(await readRentalSpaceRecord(payload.openid, id, module));
  } catch (error) {
    return handleError(error);
  }
}

/** 部分保存指定点位的场景答案、具体经历或切片确认状态。 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const payload = await authenticate(request);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const { id, module: rawModule } = await context.params;
    const module = toModule(rawModule);
    if (!module) return fail(BizCode.INVALID_PARAMS, '未知的空间点位');

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.promptVersion !== 'string' || !body.promptVersion.trim()) {
      return fail(BizCode.INVALID_PARAMS, '缺少题目版本');
    }
    const sceneAnswers = body.sceneAnswers === undefined ? undefined : toSceneAnswers(body.sceneAnswers);
    if (body.sceneAnswers !== undefined && !sceneAnswers) {
      return fail(BizCode.INVALID_PARAMS, '场景答案格式不正确');
    }
    if (body.eventText !== undefined && typeof body.eventText !== 'string') {
      return fail(BizCode.INVALID_PARAMS, '事件文字格式不正确');
    }
    if (body.eventVoiceUrl !== undefined && typeof body.eventVoiceUrl !== 'string') {
      return fail(BizCode.INVALID_PARAMS, '语音地址格式不正确');
    }
    const eventOccurredPeriod =
      body.eventOccurredPeriod === undefined ? undefined : toEventPeriod(body.eventOccurredPeriod);
    if (body.eventOccurredPeriod !== undefined && !eventOccurredPeriod) {
      return fail(BizCode.INVALID_PARAMS, '事件时段格式不正确');
    }
    if (body.isSliceConfirmed !== undefined && typeof body.isSliceConfirmed !== 'boolean') {
      return fail(BizCode.INVALID_PARAMS, '切片确认状态格式不正确');
    }

    const input: UpsertSpaceRecordInput = {
      promptVersion: body.promptVersion.trim(),
      sceneAnswers,
      eventText: body.eventText as string | undefined,
      eventVoiceUrl: body.eventVoiceUrl as string | undefined,
      eventOccurredPeriod,
      isSliceConfirmed: body.isSliceConfirmed as boolean | undefined
    };
    return ok(await saveRentalSpaceRecord(payload.openid, id, module, input));
  } catch (error) {
    return handleError(error);
  }
}
