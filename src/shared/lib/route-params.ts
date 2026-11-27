/**
 * Parses a dynamic route parameter into a safe positive integer ID, or returns null when the text is invalid.
 *
 * Calls: nothing from this project
 * Used by:
 *   - app/(marketplace)/hiring-posts/[id]/page.tsx
 *   - app/(workspace)/jobs/[id]/edit/page.tsx
 *   - app/(workspace)/my-hiring-posts/[id]/applicants/page.tsx
 *   - app/interviews/[id]/call/page.tsx
 *   - app/jobs/[id]/page.tsx
 *   - app/profile/[id]/page.tsx
 */

export function positiveIntegerRouteParam(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null

  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}
