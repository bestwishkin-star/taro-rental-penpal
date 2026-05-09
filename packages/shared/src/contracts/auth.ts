/** 登录请求：小程序 Taro.login 返回的临时 code。 */
export interface LoginRequest {
  code: string;
}

/** 登录响应：后端 token 和前端展示所需的用户基础信息。 */
export interface LoginResponse {
  token: string;
  user: {
    avatarUrl: string;
    id: string;
    nickname: string;
  };
}
