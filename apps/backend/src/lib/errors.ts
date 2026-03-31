import { BizMessage } from '@shared/errors';
import type { BizCodeValue } from '@shared/errors';

export class AppError extends Error {
  constructor(
    public readonly bizCode: BizCodeValue,
    message?: string
  ) {
    super(message ?? BizMessage[bizCode]);
    this.name = 'AppError';
  }
}
