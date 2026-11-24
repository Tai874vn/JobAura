const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Reads what the person typed as a whole number of credits. Commas are allowed. Anything else gives null. */
export function parseTopUpAmount(text: string): number | null {
  const clean = text.trim().replace(/,/g, '')
  if (!/^\d+$/.test(clean)) return null
  return Number(clean)
}

/** The message under the amount box, or null when the amount is fine. Mirrors the server (10 to 10,000, whole). */
export function topUpErrors(text: string, bounds: { min: number; max: number }): string | null {
  if (!text.trim()) return 'Enter how many credits to add.'
  const amount = parseTopUpAmount(text)
  if (amount === null) return 'Use a whole number of credits.'
  if (amount < bounds.min) return `Enter at least ${grouped.format(bounds.min)} credits.`
  if (amount > bounds.max) return `Enter at most ${grouped.format(bounds.max)} credits.`
  return null
}

/** The sandbox test money for an amount, for example 1,250 credits at 1,000 gives "1,250,000 VND". */
export function vndText(creditAmount: number, vndPerCredit: number): string {
  return `${grouped.format(creditAmount * vndPerCredit)} VND`
}
