/**
 * Removes undefined, null, and empty-string fields from a query parameter object before sending it to the backend.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/contracts/api.ts
 *   - features/hiring-pipeline/api.ts
 *   - features/wallet/api.ts
 *   - shared/api/endpoints/hiring-posts.ts
 *   - shared/api/endpoints/jobs.ts
 *   - shared/lib/search-params.ts
 */

export function definedParams<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>
}
