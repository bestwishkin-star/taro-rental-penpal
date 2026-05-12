export interface ShareExperienceDraft {
  experience: string;
  photos: string[];
  truthPledge: boolean;
}

const EXPERIENCE_REQUIRED_MESSAGE = '\u8bf7\u586b\u5199\u771f\u5b9e\u7ecf\u5386';
const PHOTO_REQUIRED_MESSAGE = '\u8bf7\u81f3\u5c11\u4e0a\u4f20 1 \u5f20\u56fe\u7247';
const PLEDGE_REQUIRED_MESSAGE = '\u8bf7\u786e\u8ba4\u5185\u5bb9\u6765\u81ea\u771f\u5b9e\u7ecf\u5386';

export function validateShareExperienceDraft(draft: ShareExperienceDraft): string | null {
  if (!draft.experience.trim()) return EXPERIENCE_REQUIRED_MESSAGE;
  if (draft.photos.length === 0) return PHOTO_REQUIRED_MESSAGE;
  if (!draft.truthPledge) return PLEDGE_REQUIRED_MESSAGE;
  return null;
}
