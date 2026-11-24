const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const two = (value: number) => String(value).padStart(2, '0')

/**
 * One time as "Tue 25 Nov, 10:00" in the viewer's own time zone. It is built by hand (not with Intl)
 * so the text is the same in every browser and language.
 */
export function formatPipelineTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}, ${two(date.getHours())}:${two(date.getMinutes())}`
}

/** The sentence told after a time is picked, for example "Interview booked for Tue 25 Nov, 10:00." */
export function bookedToastText(startsAt: string): string {
  const when = formatPipelineTime(startsAt)
  return when ? `Interview booked for ${when}.` : 'Interview booked.'
}

/** A day without a clock, for example "Tue 25 Nov" (used for contract due dates). */
export function formatPipelineDay(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`
}
