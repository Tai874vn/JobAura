/**
 * Career, job history, and experience-year helpers for resumes. Parses and validates dated jobs, checks ESCO occupation codes, picks the default occupation from the current job, and formats experience years and related credit.
 *
 * Calls: settingsConfig
 * Used by:
 *   - 7 files, for example features/candidates/utils/candidate-directory.ts, features/users/components/profile/profile-content.tsx, features/users/components/resume/resume-career-fields.tsx
 */

import { settingsConfig } from '@/features/workspace/config/settings'
import type { ResumeOccupationYears, UserResume } from '@/shared/schemas'

/** Same levels as the labeling data, so the model reads them the same way. */
/** Set in src/features/workspace/config/settings.ts */
export const degreeLevels = settingsConfig.degreeLevels

/**
 * A job in the resume. `occupation` is an ESCO code, or empty when no occupation fits the title: the job and its
 * months are kept and count toward nothing. `legacyField` is the job's old career field, read-only, shown as
 * "previously: X".
 */
export type ResumeJob = {
  title: string
  occupation: string
  legacyField?: string
  /** Month as YYYY-MM, the value of an <input type="month">. */
  start: string
  end: string
  current: boolean
  description: string
}

export const emptyResumeJob: ResumeJob = { title: '', occupation: '', start: '', end: '', current: false, description: '' }

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

/** ESCO occupation codes are an ISCO-08 unit group and one or more dotted parts, for example "2513.5". */
export function isOccupationCode(value?: string | null) {
  return typeof value === 'string' && /^\d{4}(\.\d+)+$/.test(value.trim())
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
    // A job saved before occupations still carries its old `field`; it shows as "previously: X".
    const legacyField = text('legacyField') || text('field')
    return [{
      title: text('title'),
      occupation: text('occupation'),
      ...(legacyField ? { legacyField } : {}),
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
  return !job.title.trim() && !job.occupation && !job.start && !job.end && !job.current && !job.description.trim()
}

/**
 * Jobs worth saving: completely empty rows are dropped. The old career field is not sent: the backend keeps the
 * stored one, read-only.
 */
export function savedResumeJobs(jobs: ResumeJob[]) {
  return jobs
    .filter((job) => !isBlankJob(job))
    .map((job) => ({
      title: job.title.trim(),
      occupation: job.occupation,
      start: job.start,
      end: job.current ? '' : job.end,
      current: job.current,
      description: job.description.trim(),
    }))
}

/**
 * The current job's occupation, the default main occupation while none is chosen (Decision 4). The current job is
 * the one marked "I work here now" (the latest start among several), else the one with the latest end month.
 * Empty when that job has no occupation, or when jobs tied for current name different occupations (no arbitrary pick).
 */
export function currentJobOccupation(jobs: ResumeJob[]): string {
  const working = jobs.filter((job) => job.current)
  const pool = working.length ? working : jobs.filter((job) => monthPattern.test(job.end))
  const month = (job: ResumeJob) => (job.current ? job.start : job.end)
  const latest = pool.reduce((best, job) => (month(job) > best ? month(job) : best), '')
  const occupations = new Set(pool.filter((job) => month(job) === latest).map((job) => job.occupation))
  const [only] = occupations
  return occupations.size === 1 && isOccupationCode(only) ? only : ''
}

/** A job's occupation is optional: a title that matches no occupation keeps the job, and its months count toward nothing. */
export function resumeJobProblems(job: ResumeJob, position: number): string[] {
  if (isBlankJob(job)) return []
  const label = `Job ${position}`
  const problems: string[] = []
  if (!job.title.trim()) problems.push(`${label}: add the job title.`)
  if (!monthPattern.test(job.start)) problems.push(`${label}: add the start month.`)
  if (!job.current && !monthPattern.test(job.end)) problems.push(`${label}: add the end month, or tick "I work here now".`)
  if (!job.current && monthPattern.test(job.start) && monthPattern.test(job.end) && job.end < job.start) {
    problems.push(`${label}: the end month is before the start month.`)
  }
  return problems
}

/**
 * Everything that must be fixed before saving. The occupation is required; the specialty is optional, and when
 * the occupation's specialties are known it must be one of them.
 */
export function resumeCareerProblems(
  draft: { Occupation?: string; Specialty?: string; Jobs?: string },
  specialties?: string[],
): string[] {
  const problems: string[] = []
  if (!isOccupationCode(draft.Occupation)) problems.push('Choose your occupation.')
  else if (specialties && draft.Specialty?.trim() && !specialties.includes(draft.Specialty.trim())) {
    problems.push('Choose a specialty listed under your occupation.')
  }
  parseResumeJobs(draft.Jobs).forEach((job, index) => problems.push(...resumeJobProblems(job, index + 1)))
  return problems
}

/** What counts toward years: the main occupation, and each job's occupation and dates. */
function yearsInputs(occupation: unknown, jobs: unknown) {
  return JSON.stringify([
    typeof occupation === 'string' ? occupation.trim() : '',
    savedResumeJobs(parseResumeJobs(jobs)).map((job) => [job.occupation, job.start, job.end, job.current]),
  ])
}

/**
 * The saved resume's years breakdown, counted by the backend as the AI counts them, while the draft's occupation
 * and job dates are still the saved ones. Null once they change (the years are recounted on save) or without an
 * occupation.
 */
export function savedOccupationYears(
  resume: Pick<UserResume, 'data' | 'occupationYears'> | null | undefined,
  draft: { Occupation?: string; Jobs?: string },
): ResumeOccupationYears | null {
  const years = resume?.occupationYears
  if (!years) return null
  return yearsInputs(resume.data?.Occupation, resume.data?.Jobs) === yearsInputs(draft.Occupation, draft.Jobs) ? years : null
}

/** Years as the AI reads them, for display: "3 yr", "1.5 yr", "0 yr". */
export function formatYears(years: number) {
  return `${Number.isInteger(years) ? years : years.toFixed(1)} yr`
}

/** A credit to one decimal: "0.2". */
export function formatCredit(credit: number) {
  return credit.toFixed(1)
}

/**
 * Occupations that get their own "Related experience" line: closely related ones (ESCO skill-group overlap of at
 * least 0.25) whose share of the credit shows. The rest of the credit is one "Other experience" line.
 */
export function relatedLines(years: ResumeOccupationYears) {
  return years.others.filter((other) => other.closelyRelated && other.shownCredit > 0)
}
