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
