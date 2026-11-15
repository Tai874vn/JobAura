import { currency } from '@/shared/lib/utils'

/** A post with a rate shows "From $X"; a portfolio post (price 0) shows no price at all. */
export function servicePriceLabel(price?: number | null) {
  return typeof price === 'number' && price > 0 ? `From ${currency(price)}` : null
}

export function isPortfolioPost(price?: number | null) {
  return servicePriceLabel(price) === null
}
