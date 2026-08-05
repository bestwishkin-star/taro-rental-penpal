import type { VerifyRentalProofInput } from '@shared/contracts/rental-space';
import { BizCode } from '@shared/errors';

import { AppError } from '@/lib/errors';

import { rentalProofExists, saveRentalProofVerification } from './rental-proof-verification.repository';

/** 校验凭证存在后写入管理员核验结果。 */
export async function verifyRentalProof(proofId: string, adminOpenid: string, input: VerifyRentalProofInput) {
  if (!(await rentalProofExists(proofId))) throw new AppError(BizCode.NOT_FOUND, '居住凭证不存在');
  await saveRentalProofVerification(proofId, input.status, adminOpenid);
}
