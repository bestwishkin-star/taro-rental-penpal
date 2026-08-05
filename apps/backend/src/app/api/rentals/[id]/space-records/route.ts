import { handleError, ok } from '@/lib/response';
import { readPublishedRentalSpaces } from '@/modules/rentals/rental-space-public.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** 获取已发布故事的公开空间切片和可信依据。 */
export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(await readPublishedRentalSpaces(id));
  } catch (error) {
    return handleError(error);
  }
}
