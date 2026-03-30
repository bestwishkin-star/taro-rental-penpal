export interface UserProfile {
  avatarUrl: string;
  budget: string;
  city: string;
  id: string;
  moveInDate: string;
  nickname: string;
  preferredDistrict: string;
  roommateExpectation: string;
  verified: boolean;
}

export interface UserProfileInput {
  budget: string;
  city: string;
  moveInDate: string;
  nickname: string;
  preferredDistrict: string;
  roommateExpectation: string;
}
