import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PhotoUploadSource } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { verifyToken } from '@/lib/jwt';
import { fail, handleError, ok } from '@/lib/response';
import { registerPhotoAsset } from '@/modules/photo-analysis/photo-asset.service';

/** 单张现场照片允许的最大体积。 */
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

/** 根据可信 MIME 生成服务端扩展名，禁止直接使用用户文件名扩展名。 */
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

/** 将表单来源收敛为共享合同支持的固定枚举。 */
function normalizeUploadSource(value: FormDataEntryValue | null): PhotoUploadSource {
  if (value === 'CAMERA' || value === 'ALBUM') return value;
  return 'OTHER';
}

/** 校验真实文件签名，避免伪装成图片的任意文件进入上传目录。 */
function hasExpectedImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

/** 上传并注册一个具有统一资产 ID 的图片文件。 */
export async function POST(request: Request) {
  let savedPath = '';
  try {
    const auth = request.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const payload = await verifyToken(token);
    if (!payload) return fail(BizCode.UNAUTHORIZED);

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') return fail(BizCode.INVALID_PARAMS, '未收到图片文件');

    const extension = MIME_EXTENSIONS[file.type];
    if (!extension) return fail(BizCode.INVALID_PARAMS, '仅支持 JPG、PNG 或 WebP 图片');
    if (file.size <= 0 || file.size > MAX_PHOTO_SIZE) {
      return fail(BizCode.INVALID_PARAMS, '图片大小需在 10MB 以内');
    }

    const filename = `${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const fileUrl = new URL(`/uploads/${filename}`, request.url).toString();
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedImageSignature(buffer, file.type)) {
      return fail(BizCode.INVALID_PARAMS, '图片文件内容不正确');
    }

    // 先完成文件落盘，再注册数据库资产；数据库失败时 catch 会清理孤立文件。
    await mkdir(uploadDir, { recursive: true });
    savedPath = path.join(uploadDir, filename);
    await writeFile(savedPath, buffer);

    const result = await registerPhotoAsset({
      ownerOpenid: payload.openid,
      fileUrl,
      mimeType: file.type,
      buffer,
      uploadSource: normalizeUploadSource(formData.get('source'))
    });
    return ok(result);
  } catch (error) {
    if (savedPath) await unlink(savedPath).catch(() => undefined);
    return handleError(error);
  }
}
