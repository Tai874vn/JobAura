import { occupationLabel } from '@/features/occupations/api'
import { createHiringPostSchema, type CreateHiringPost, type HiringPost } from '@/shared/schemas'

export const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'] as const
export const hiringPostLevels = ['Junior', 'Mid', 'Senior'] as const

/** What the form edits. Numbers stay text so a half-typed value isn't lost. */
export type HiringPostDraft = {
  title: string
  companyName: string
  /** ESCO occupation code, or empty until one is picked. */
  occupationCode: string
  /** One of the occupation's specialties, or empty. */
  specialty: string
  /** The old 37-field value of a post saved before occupations, shown as "previously: X". Never sent. */
  legacyField: string
  yearsRequired: string
  employmentType: string
  location: string
  closesAt: string
  description: string
  skills: string[]
  requirements: string
  salaryMin: string
  salaryMax: string
}

export const emptyHiringPostDraft: HiringPostDraft = {
  title: '', companyName: '', occupationCode: '', specialty: '', legacyField: '', yearsRequired: '', employmentType: 'Full-time', location: '',
  closesAt: '', description: '', skills: [], requirements: '', salaryMin: '', salaryMax: '',
}

const text = (value?: string | null) => value ?? ''
const number = (value?: number | null) => (value == null ? '' : String(value))

export function draftFromPost(post: HiringPost): HiringPostDraft {
  return {
    title: post.title,
    companyName: text(post.companyName),
    occupationCode: text(post.occupationCode),
    specialty: text(post.specialty),
    legacyField: text(post.legacyField),
    yearsRequired: number(post.yearsRequired),
    employmentType: text(post.employmentType),
    location: text(post.location),
    closesAt: post.closesAt ? post.closesAt.slice(0, 10) : '',
    description: post.description,
    skills: post.skills ?? [],
    requirements: text(post.requirements),
    salaryMin: number(post.salaryMin),
    salaryMax: number(post.salaryMax),
  }
}

/** Today as YYYY-MM-DD in the user's time zone, the earliest closing date the form accepts. */
export function todayInput(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

/**
 * Check the draft and turn it into the API payload. A closing date means the end of that day, local time. When
 * the occupation's specialties are known, the specialty must be one of them. An empty specialty is sent as null,
 * so an edit clears it; the old field is never sent.
 */
export function hiringPostPayload(
  draft: HiringPostDraft,
  now = new Date(),
  specialties?: string[],
): { data: CreateHiringPost; error?: undefined } | { data?: undefined; error: string } {
  const specialty = draft.specialty.trim()
  if (specialty && !draft.occupationCode) return { error: 'Choose the occupation before its specialty' }
  if (specialty && specialties && !specialties.includes(specialty)) return { error: 'Choose a specialty listed under the occupation' }
  if (draft.closesAt && draft.closesAt < todayInput(now)) return { error: 'The closing date must be today or later' }
  const optional = (value: string) => value.trim() || undefined
  const parsed = createHiringPostSchema.safeParse({
    title: draft.title.trim(),
    companyName: optional(draft.companyName),
    occupationCode: draft.occupationCode,
    specialty: specialty || null,
    yearsRequired: draft.yearsRequired.trim() === '' ? undefined : draft.yearsRequired,
    employmentType: optional(draft.employmentType),
    location: optional(draft.location),
    closesAt: draft.closesAt ? new Date(`${draft.closesAt}T23:59:59`).toISOString() : undefined,
    description: draft.description.trim(),
    skills: draft.skills,
    requirements: optional(draft.requirements),
    salaryMin: draft.salaryMin.trim() === '' ? undefined : draft.salaryMin,
    salaryMax: draft.salaryMax.trim() === '' ? undefined : draft.salaryMax,
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the hiring post details' }
  return { data: parsed.data }
}

/** What a post card names: the occupation's title, or the old field of a post saved before occupations. */
export function postOccupation(post: Pick<HiringPost, 'occupationTitle' | 'legacyField'>) {
  if (post.occupationTitle) return { label: occupationLabel(post.occupationTitle), legacy: false }
  if (post.legacyField) return { label: post.legacyField, legacy: true }
  return null
}
