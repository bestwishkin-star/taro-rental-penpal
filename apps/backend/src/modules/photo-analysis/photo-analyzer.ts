import type { PhotoAnalysisType } from '@shared/contracts/rental-space';

/** 提供给具体 AI 厂商适配器的标准图片上下文。 */
export interface PhotoAnalysisInput {
  assetId: string;
  fileUrl: string;
  mimeType: string;
  referenceAssetIds?: string[];
}

/** 厂商结果归一化后的风险信号，业务层不读取厂商私有字段。 */
export interface PhotoAnalysisResult {
  resultCode: string;
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  signals: Record<string, string | number | boolean>;
  rawResult?: unknown;
}

/** 所有图片安全或一致性厂商必须实现的稳定适配器接口。 */
export interface PhotoAnalyzer {
  readonly type: PhotoAnalysisType;
  readonly provider: string;
  readonly modelVersion: string;
  readonly policyVersion?: string;
  analyze(input: PhotoAnalysisInput): Promise<PhotoAnalysisResult>;
}
