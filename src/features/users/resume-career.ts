// Career fields the seniority model reads. Keep `careerFields` identical to FIELDS in
// AIService app/career_fields.py: the labeled training data and the seniority model use the same list.
export const careerFields = [
  'QA',
  'Data',
  'IT and security',
  'DevOps',
  'Software development',
  'Business analysis',
  'Project and product management',
  'Design',
  'HR and recruiting',
  'Marketing and PR',
  'Sales and business development',
  'Accounting',
  'Banking',
  'Finance',
  'Insurance',
  'Customer support',
  'Teaching',
  'Healthcare',
  'Food and hospitality',
  'Construction',
  'Aviation',
  'Automotive',
  'Agriculture',
  'Social work',
  'Legal',
  'Fitness',
  'Beauty and personal care',
  'Media and arts',
  'Apparel and fashion',
  'Real estate',
  'Logistics and transport',
  'Public safety and security',
  'Manufacturing and production',
  'Science and research',
  'Consulting',
  'Administration',
  'Engineering',
] as const

/** Same levels as the labeling data, so the model reads them the same way. */
export const degreeLevels = ['Not stated', 'Below bachelor', 'Bachelor', 'Master or higher'] as const

export type ResumeJob = {
  title: string
  field: string
  /** Month as YYYY-MM, the value of an <input type="month">. */
  start: string
  end: string
  current: boolean
  description: string
}

export const emptyResumeJob: ResumeJob = { title: '', field: '', start: '', end: '', current: false, description: '' }

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

export function isCareerField(value?: string | null) {
  return careerFields.some((field) => field === value)
}

/** Reads jobs saved as an array, or kept as a JSON string inside the string-only form draft. */
export function parseResumeJobs(value: unknown): ResumeJob[] {
  let raw = value
  if (typeof raw === 'string') {
    try {
      raw = raw.trim() ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const job = item as Record<string, unknown>
    const text = (key: string) => (typeof job[key] === 'string' ? (job[key] as string) : '')
    return [{
      title: text('title'),
      field: text('field'),
      start: text('start'),
      end: text('end'),
      current: job.current === true,
      description: text('description'),
    }]
  })
}

export function serializeResumeJobs(jobs: ResumeJob[]) {
  return JSON.stringify(jobs)
}

function isBlankJob(job: ResumeJob) {
  return !job.title.trim() && !job.field && !job.start && !job.end && !job.current && !job.description.trim()
}

/** Jobs worth saving: completely empty rows are dropped. */
export function savedResumeJobs(jobs: ResumeJob[]) {
  return jobs
    .filter((job) => !isBlankJob(job))
    .map((job) => ({ ...job, title: job.title.trim(), description: job.description.trim(), end: job.current ? '' : job.end }))
}

export function resumeJobProblems(job: ResumeJob, position: number): string[] {
  if (isBlankJob(job)) return []
  const label = `Job ${position}`
  const problems: string[] = []
  if (!job.title.trim()) problems.push(`${label}: add the job title.`)
  if (!isCareerField(job.field)) problems.push(`${label}: choose the field.`)
  if (!monthPattern.test(job.start)) problems.push(`${label}: add the start month.`)
  if (!job.current && !monthPattern.test(job.end)) problems.push(`${label}: add the end month, or tick "I work here now".`)
  if (!job.current && monthPattern.test(job.start) && monthPattern.test(job.end) && job.end < job.start) {
    problems.push(`${label}: the end month is before the start month.`)
  }
  return problems
}

/** Everything that must be fixed before saving. The field and specialty are required. */
export function resumeCareerProblems(draft: { Industry?: string; Specialty?: string; Jobs?: string }): string[] {
  const problems: string[] = []
  if (!isCareerField(draft.Industry)) problems.push('Choose your field.')
  if (!draft.Specialty?.trim()) problems.push('Add your specialty, for example Fullstack.')
  parseResumeJobs(draft.Jobs).forEach((job, index) => problems.push(...resumeJobProblems(job, index + 1)))
  return problems
}

function monthIndex(value: string) {
  const [year, month] = value.split('-').map(Number)
  return year * 12 + month - 1
}

/** Months spent in one field, counting overlapping jobs once. Current jobs run to `today`. */
export function monthsInField(jobs: ResumeJob[], field: string, today = new Date()) {
  const now = today.getFullYear() * 12 + today.getMonth()
  const spans = jobs
    .filter((job) => job.field === field && monthPattern.test(job.start) && (job.current || monthPattern.test(job.end)))
    .map((job) => [monthIndex(job.start), job.current ? now : monthIndex(job.end)] as const)
    .filter(([start, end]) => end >= start)
    .sort((a, b) => a[0] - b[0])
  let total = 0
  let span: [number, number] | null = null
  for (const [start, end] of spans) {
    if (span && start <= span[1]) {
      span[1] = Math.max(span[1], end)
    } else {
      if (span) total += span[1] - span[0]
      span = [start, end]
    }
  }
  return span ? total + span[1] - span[0] : 0
}

export function formatMonths(months: number) {
  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = [years ? `${years} yr` : '', rest ? `${rest} mo` : ''].filter(Boolean)
  return parts.join(' ') || 'under 1 mo'
}

/**
 * Months in the chosen field, counted from the jobs' start and end months: the only source of years of experience
 * (the backend's yearsInField counts the same way). Null until a field from the list is chosen.
 */
export function experienceMonths(draft: { Industry?: string | null; Jobs?: unknown }, today = new Date()): number | null {
  if (!isCareerField(draft.Industry)) return null
  return monthsInField(parseResumeJobs(draft.Jobs), draft.Industry as string, today)
}

/** "2 yr 3 mo", "No experience yet", or null without a field. */
export function experienceLabel(draft: { Industry?: string | null; Jobs?: unknown }, today = new Date()) {
  const months = experienceMonths(draft, today)
  if (months === null) return null
  return months ? formatMonths(months) : 'No experience yet'
}
