import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { BizCode } from '@shared/errors';

import { fail, handleError, ok } from '@/lib/response';
import { findUserByToken } from '@/modules/auth/auth.repository';

// 关闭 Next.js 默认 body 解析，允许大文件上传
export const config = {
  api: { bodyParser: false }
};

function extractToken(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) return fail(BizCode.UNAUTHORIZED);

    const user = await findUserByToken(token);
    if (!user) return fail(BizCode.UNAUTHORIZED);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return fail(BizCode.INVALID_PARAMS, '未收到文件');
    }

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    // 确保目录存在
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return ok({ url: `/uploads/${filename}` });
  } catch (error) {
    return handleError(error);
  }
}
