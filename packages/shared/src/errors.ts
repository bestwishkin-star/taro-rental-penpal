export type BizCodeValue = (typeof BizCode)[keyof typeof BizCode];

export const BizCode = {
  // 成功
  OK: 0,

  // 通用错误 1000-1099
  UNKNOWN: 1000,
  INVALID_PARAMS: 1001,
  UNAUTHORIZED: 1002,
  FORBIDDEN: 1003,
  NOT_FOUND: 1004,

  // 认证 1100-1199
  WECHAT_LOGIN_FAILED: 1100,
  TOKEN_INVALID: 1101,
  TOKEN_EXPIRED: 1102,

  // 用户 1200-1299
  USER_NOT_FOUND: 1200,
  USER_PROFILE_INCOMPLETE: 1201,

  // 租房 1300-1399
  RENTAL_NOT_FOUND: 1300,
  RENTAL_PERMISSION_DENIED: 1301,

  // 聊天 1400-1499
  CONVERSATION_NOT_FOUND: 1400,
};

export const BizMessage = {
  [BizCode.OK]: '成功',
  [BizCode.UNKNOWN]: '系统错误',
  [BizCode.INVALID_PARAMS]: '参数错误',
  [BizCode.UNAUTHORIZED]: '未登录',
  [BizCode.FORBIDDEN]: '无权限',
  [BizCode.NOT_FOUND]: '资源不存在',
  [BizCode.WECHAT_LOGIN_FAILED]: '微信登录失败',
  [BizCode.TOKEN_INVALID]: 'Token 无效',
  [BizCode.TOKEN_EXPIRED]: 'Token 已过期',
  [BizCode.USER_NOT_FOUND]: '用户不存在',
  [BizCode.USER_PROFILE_INCOMPLETE]: '用户信息未完善',
  [BizCode.RENTAL_NOT_FOUND]: '租房信息不存在',
  [BizCode.RENTAL_PERMISSION_DENIED]: '无权操作该租房信息',
  [BizCode.CONVERSATION_NOT_FOUND]: '会话不存在',
};
