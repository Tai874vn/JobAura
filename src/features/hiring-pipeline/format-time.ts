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
