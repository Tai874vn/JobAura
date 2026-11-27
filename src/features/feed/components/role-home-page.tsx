'use client'

/**
 * Thin wrapper component for the home feed feature that renders FeedPage.
 * Kept for callers while employers are redirected to /my-hiring-posts by the layout auth guard.
 *
 * Calls: FeedPage
 * Used by:
 *   - no file imports it (only tests, or not used)
 */

import { FeedPage } from './feed-page'

/** Direct export kept for callers; employers are routed to /my-hiring-posts by FeedLayout's RequireAuth. */
export function RoleHomePage() {
  return <FeedPage />
}
