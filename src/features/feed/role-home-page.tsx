'use client'

import { FeedPage } from './feed-page'

/** Direct export kept for callers; employers are routed to /my-hiring-posts by FeedLayout's RequireAuth. */
export function RoleHomePage() {
  return <FeedPage />
}
