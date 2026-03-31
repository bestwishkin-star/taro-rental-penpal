import { BizCode, BizMessage } from '@shared/errors';

type BizCodeValue = (typeof BizCode)[keyof typeof BizCode];

export class AppError extends Error {
  constructor(
    public readonly bizCode: BizCodeValue,
    message?: string
  ) {
    super(message ?? BizMessage[bizCode]);
    this.name = 'AppError';
  }
}
