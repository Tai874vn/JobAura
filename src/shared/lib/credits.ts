/**
 * Formats credit amounts as plain words like "1,250 credits" or "+500 credits" for wallets, contracts, and pricing views.
 *
 * Calls: nothing from this project
 * Used by:
 *   - 23 files, for example features/admin/components/admin-resource-model.tsx, features/contracts/components/contract-list-item.tsx, features/contracts/components/contract/contract-action-bar.tsx
 */

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/**
 * An amount of credits as words: 1250 gives "1,250 credits", 1 gives "1 credit". Never a currency sign.
 * With `sign: true` a gain reads "+500 credits" and a loss reads "−500 credits" (a real minus sign).
 */
export function credits(n: number, opts: { sign?: boolean } = {}): string {
  const whole = Math.round(n)
  const word = Math.abs(whole) === 1 ? 'credit' : 'credits'
  const sign = whole < 0 ? '−' : opts.sign && whole > 0 ? '+' : ''
  return `${sign}${grouped.format(Math.abs(whole))} ${word}`
}
