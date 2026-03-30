import { BizCode, BizMessage } from '@shared/errors';

export class AppError extends Error {
  constructor(
    public readonly bizCode: BizCode,
    message?: string
  ) {
    super(message ?? BizMessage[bizCode]);
    this.name = 'AppError';
  }
}
