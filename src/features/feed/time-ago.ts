const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Relative display time: now, 5m, 3h, 2d, then "Oct 4" (+year when not current). */
export function timeAgo(value: string, now: Date = new Date()) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d`

  const sameYear = date.getUTCFullYear() === now.getUTCFullYear()
  const monthDay = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
  return sameYear ? monthDay : `${monthDay}, ${date.getUTCFullYear()}`
}
