/**
 * Shared constants for the Recommended candidates (/recommendations/candidates) page.
 * Exports default pagination params for loading hiring posts and copies topK and poolSize dropdown options from config.
 *
 * Calls: aiMatchingConfig
 * Used by:
 *   - features/candidates/components/recommended-candidates/hiring-post-selection-panel.tsx
 *   - features/candidates/components/recommended-candidates/recommended-candidates-page.tsx
 */

import { aiMatchingConfig } from '@/features/candidates/config/ai-matching'
export const hiringPostPageParams = { page: 1, pageSize: 50 };
/** Set in src/features/candidates/config/ai-matching.ts */
export const topKOptions: number[] = [...aiMatchingConfig.topKOptions];
export const poolSizeOptions: number[] = [...aiMatchingConfig.poolSizeOptions];
