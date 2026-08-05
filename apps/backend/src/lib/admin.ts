/**
 * 使用环境变量白名单判断管理员身份。
 * 未配置 ADMIN_OPENIDS 时默认拒绝所有管理操作，避免“登录即管理员”。
 */
export function isConfiguredAdmin(openid: string): boolean {
  const adminOpenids = new Set(
    (process.env.ADMIN_OPENIDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  return adminOpenids.has(openid);
}
