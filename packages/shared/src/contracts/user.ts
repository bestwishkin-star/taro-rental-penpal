/** 用户资料：个人中心和设置页展示的完整资料结构。 */
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

/** 用户资料保存入参：设置页可编辑字段。 */
export interface UserProfileInput {
  avatarUrl?: string;
  budget: string;
  city: string;
  moveInDate: string;
  nickname: string;
  preferredDistrict: string;
  roommateExpectation: string;
}
