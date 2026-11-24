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
