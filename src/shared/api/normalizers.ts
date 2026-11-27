/**
 * Re-exports all API response normalizers from the core, social, and marketplace modules.
 *
 * Calls: normalizers/core; normalizers/social; normalizers/marketplace
 * Used by:
 *   - 20 files, for example app/(marketplace)/hiring-posts/[id]/page.tsx, app/(marketplace)/hiring-posts/page.tsx, app/(marketplace)/jobs/page.tsx
 */

export * from './normalizers/core'
export * from './normalizers/social'
export * from './normalizers/marketplace'
