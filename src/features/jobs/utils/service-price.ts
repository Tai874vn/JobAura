/**
 * Formatting helpers for service prices, portfolio-post checks, and work-mode location labels in the Jobs feature.
 * Turns positive prices into a "From X credits" label and treats price 0 as a portfolio post.
 *
 * Calls: credits
 * Used by:
 *   - 8 files, for example features/contracts/components/chat-proposal-button.tsx, features/jobs/components/browse/job-card.tsx, features/jobs/components/browse/job-result-card.tsx
 */

import { credits } from '@/shared/lib/credits'
import type { Job } from '@/shared/schemas'

/** A post with a rate shows "From 1,250 credits"; a portfolio post (price 0) shows no price at all. */
export function servicePriceLabel(price?: number | null) {
  return typeof price === 'number' && price > 0 ? `From ${credits(price)}` : null
}

export function isPortfolioPost(price?: number | null) {
  return servicePriceLabel(price) === null
}

/** Where the work happens, in a short line: "Remote", "Onsite in Hanoi", "Remote or onsite in Hanoi". */
export function workModeLine(mode: Job['workMode'], area?: string | null) {
  const place = area?.trim()
  const base = mode === 'ONSITE' ? 'Onsite' : mode === 'BOTH' ? 'Remote or onsite' : 'Remote'
  return place && (mode === 'ONSITE' || mode === 'BOTH') ? `${base} in ${place}` : base
}
