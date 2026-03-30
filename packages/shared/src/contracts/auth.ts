export interface LoginRequest {
  code: string;
}

export interface LoginResponse {
  token: string;
  user: {
    avatarUrl: string;
    id: string;
    nickname: string;
  };
}
