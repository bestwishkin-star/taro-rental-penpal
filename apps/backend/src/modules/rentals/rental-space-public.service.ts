import { getPublishedRentalSpaces, hasVerifiedRentalProof } from './rental-space-public.repository';
import { getRentalCheckinSummary } from './rental-checkin.repository';

/** 聚合空间记录、连续居住和凭证核验三类公开可信依据。 */
export async function readPublishedRentalSpaces(rentalId: string) {
  const result = await getPublishedRentalSpaces(rentalId);
  if (result.records.length === 0) return result;
  const [checkins, hasVerifiedProof] = await Promise.all([
    getRentalCheckinSummary(rentalId),
    hasVerifiedRentalProof(rentalId)
  ]);
  result.trustEvidence.checkins = checkins;
  if (checkins.hasContinuousResidency) result.trustEvidence.labels.push('CONTINUOUS_RESIDENCY');
  if (hasVerifiedProof) result.trustEvidence.labels.push('RESIDENCY_PROOF_VERIFIED');
  return result;
}
