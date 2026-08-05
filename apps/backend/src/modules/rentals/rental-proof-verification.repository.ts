import type { RentalProofVerificationStatus } from '@shared/contracts/rental-space';
import type { RowDataPacket } from 'mysql2/promise';

import { pool } from '@/lib/mysql';

/** 判断私密凭证是否真实存在，避免创建悬空核验记录。 */
export async function rentalProofExists(proofId: string): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT 1 FROM rental_post_proofs WHERE id = ?', [proofId]);
  return rows.length > 0;
}

/** 幂等保存管理员核验结果和操作人。 */
export async function saveRentalProofVerification(
  proofId: string,
  status: Exclude<RentalProofVerificationStatus, 'SUBMITTED'>,
  verifiedBy: string
): Promise<void> {
  await pool.execute(
    `INSERT INTO rental_proof_verifications
      (proof_id, verification_status, verified_by, verified_at, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE verification_status = VALUES(verification_status),
       verified_by = VALUES(verified_by), verified_at = NOW(), updated_at = NOW()`,
    [proofId, status, verifiedBy]
  );
}
