/**
 * Picks the base origin for browser API and auth requests.
 * Uses the current page origin when the same-origin proxy is enabled, or falls back to the configured origin.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/auth/components/auth-forms.tsx
 *   - shared/api/client.ts
 */

export function resolveClientOrigin(
  configuredOrigin: string,
  useSameOriginProxy: boolean,
  runtimeOrigin?: string
) {
  if (!useSameOriginProxy || !runtimeOrigin) return configuredOrigin
  return new URL(runtimeOrigin).origin
}
