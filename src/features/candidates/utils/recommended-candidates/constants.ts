import { aiMatchingConfig } from '@/features/candidates/config/ai-matching'
export const hiringPostPageParams = { page: 1, pageSize: 50 };
/** Set in src/features/candidates/config/ai-matching.ts */
export const topKOptions: number[] = [...aiMatchingConfig.topKOptions];
export const poolSizeOptions: number[] = [...aiMatchingConfig.poolSizeOptions];
