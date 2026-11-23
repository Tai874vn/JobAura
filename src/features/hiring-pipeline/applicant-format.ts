const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A date as "12 Nov" in the viewer's time zone (built by hand so every browser reads the same). */
export function formatApplicantDay(iso: string | null | undefined): string {
  const date = new Date(iso ?? '')
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getDate()} ${months[date.getMonth()]}`
}

/** "1 year", "5 years", "2.5 years". */
export function formatYears(years: number | null | undefined): string {
  if (years == null) return 'Not given'
  return years === 1 ? '1 year' : `${years} years`
}

/** "2022-03" becomes "Mar 2022"; anything else is shown as it is. */
function month(value: unknown): string {
  if (typeof value !== 'string') return ''
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${months[Number(match[2]) - 1] ?? match[2]} ${match[1]}`
}

export type ResumeJobLine = { title: string; period: string }

/** One line per job in the resume. The backend sends jobs as loose objects, so every key is checked. */
export function resumeJobLines(jobs: unknown[]): ResumeJobLine[] {
  return jobs.map((raw) => {
    const job = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const start = month(job.start)
    const end = job.current === true ? 'Present' : month(job.end)
    const title = typeof job.title === 'string' && job.title.trim() ? job.title.trim() : 'Job'
    return { title, period: [start, end].filter(Boolean).join(' - ') }
  })
}
