import type { PhotoAnalyzer } from './photo-analyzer';

/**
 * 已启用的图片分析器注册表。
 * 未配置厂商时保持空数组，系统会明确返回 UNCHECKED，而不是伪造审核通过。
 */
export const configuredPhotoAnalyzers: readonly PhotoAnalyzer[] = [];
