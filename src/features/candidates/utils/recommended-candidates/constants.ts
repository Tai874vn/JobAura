import { aiMatchingConfig } from '@/page-config/ai-matching'
export const hiringPostPageParams = { page: 1, pageSize: 50 };
/** Set in src/page-config/ai-matching.ts */
export const topKOptions: number[] = [...aiMatchingConfig.topKOptions];
export const poolSizeOptions: number[] = [...aiMatchingConfig.poolSizeOptions];
