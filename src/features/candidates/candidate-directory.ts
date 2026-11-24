import { occupationLabel } from '@/features/occupations/api'
import { formatCredit, formatYears } from '@/features/users/resume-career'
import type { CandidateDirectoryParams, CandidateProfile } from '@/shared/schemas'

/**
 * Pure logic for the Find candidates (/candidates) browse page:
 * reading and building URL query parameters (the ?key=value part of the web address),
 * formatting career, degree and card facts, and deciding which card actions show.
 */

export const candidatesPageSize = 12

/** AI seniority levels accepted by GET /api/users/candidates. */
export const candidateLevels = ['Junior', 'Mid', 'Senior'] as const
export type CandidateLevel = (typeof candidateLevels)[number]

/** Quick minimum-years choices in the filter sidebar; custom values from 1 to 40 also work. */
export const candidateMinYearsPresets = [1, 3, 5, 8] as const

export type CandidateListFilters = {
  keyword: string
  location: string
  skill: string
  /** ESCO occupation code, e.g. "2513.5". */
  occupation: string
  /** Only applies when an occupation is chosen. */
  includeRelated: boolean
  level: '' | CandidateLevel
  /** Whole years from 1 to 40, or undefined when not filtering by years. */
  minYears?: number
  hasPortfolio: boolean
  hasCertification: boolean
}

export type CandidateViewer = {
  id: number
  role?: string | null
} | null | undefined

export type CandidateCardActions = {
  viewProfile: true
  /** True when a signed-in viewer is looking at someone else's card. */
  message: boolean
  /** True when a signed-in viewer can connect with this candidate. */
  connect: boolean
}

export type CandidateCardFacts = {
  hasResume: boolean
  /** Main occupation title (capitalised), or null if the resume has no occupation yet. */
  occupation: string | null
  /** O*NET specialty under the occupation, or null. */
  specialty: string | null
  /** Fallback text when a resume exists but has no ESCO occupation yet. */
  occupationNotice: string | null
  /** AI-predicted seniority level ("Junior", "Mid", "Senior"), or null. */
  level: string | null
  /** Years in the main occupation, e.g. "3 yr as Web developer", or null. */
  years: string | null
  /** Related experience credit, e.g. "+0.3 yr related", or null. */
  relatedYears: string | null
  /** Candidate location when listed, or null. */
  location: string | null
  /** Highest degree from the resume when present and stated, or null. */
  degree: string | null
  /** Non-empty facts joined with a dot on the card's facts line (years, related years, location). */
  facts: string[]
}

export function getCandidateSkillNames(candidate: CandidateProfile) {
  return (candidate.profileSkills ?? [])
    .map((skill) => skill.name.trim())
    .filter(Boolean)
}

/**
 * What a candidate card says about the resume: the occupation title, the specialty, years in the occupation and
 * related years, each on its own. The years are the ones saved with the AI prediction, so a resume with no
 * prediction shows no years. A resume saved before occupations shows its old field. Null without a resume.
 */
export function formatCandidateCareer(candidate: CandidateProfile) {
  const career = candidate.career
  if (!career) return null
  if (!career.occupationTitle) {
    return { occupation: null, previously: career.legacyField, specialty: null, years: null, related: null }
  }
  const occupation = occupationLabel(career.occupationTitle)
  return {
    occupation,
    previously: null,
    specialty: career.specialty,
    years: career.yearsInOccupation == null ? null : `${formatYears(career.yearsInOccupation)} as ${occupation}`,
    related: career.relatedYears ? `+${formatCredit(career.relatedYears)} yr related` : null,
  }
}

/** Highest degree text when the backend sends education and the degree is stated (skips "Not stated"). */
export function formatCandidateDegree(candidate: Pick<CandidateProfile, 'education'>): string | null {
  const degree = candidate.education?.degree?.trim()
  if (!degree || degree.toLowerCase() === 'not stated') return null
  return degree
}

/**
 * Builds the structured facts shown on a candidate result card.
 * Without a resume, resume fields stay null so the card shows a plain "No resume yet" line instead of empty facts.
 */
export function candidateCardFacts(candidate: CandidateProfile): CandidateCardFacts {
  const career = formatCandidateCareer(candidate)
  const location = candidate.location?.trim() || null
  const degree = formatCandidateDegree(candidate)

  if (!career) {
    return {
      hasResume: false,
      occupation: null,
      specialty: null,
      occupationNotice: null,
      level: null,
      years: null,
      relatedYears: null,
      location,
      degree,
      facts: location ? [location] : [],
    }
  }

  const occupationNotice = !career.occupation
    ? career.previously
      ? `Previously: ${career.previously} · no occupation chosen yet`
      : 'No occupation chosen yet'
    : null
  const level = candidate.career?.level?.trim() || null
  const facts = [career.years, career.related, location].filter((item): item is string => Boolean(item))

  return {
    hasResume: true,
    occupation: career.occupation,
    specialty: career.specialty,
    occupationNotice,
    level,
    years: career.years,
    relatedYears: career.related,
    location,
    degree,
    facts,
  }
}

/** Decides which actions appear on a candidate result card for the current viewer. */
export function candidateCardActions(
  candidate: Pick<CandidateProfile, 'id'>,
  viewer: CandidateViewer,
): CandidateCardActions {
  const isSignedIn = Boolean(viewer && viewer.id > 0)
  const isOtherUser = Boolean(isSignedIn && candidate.id > 0 && viewer!.id !== candidate.id)
  return {
    viewProfile: true,
    message: isOtherUser,
    connect: isOtherUser,
  }
}

/**
 * The minimum-years filter's label. It reads main-occupation years only (the card's "N yr as <occupation>"), not
 * related years, so it names the occupation: "Years as Web developer", or "Years in the occupation" before one is
 * chosen (or while its title loads).
 */
export function minYearsLabel(occupationTitle: string | null | undefined) {
  return occupationTitle ? `Years as ${occupationTitle}` : 'Years in the occupation'
}

/** The occupation part of the candidate search: the code, and its related occupations only when one is chosen. */
export function occupationParams(occupation: string, includeRelated: boolean): Pick<CandidateDirectoryParams, 'occupation' | 'includeRelated'> {
  if (!occupation) return {}
  return { occupation, includeRelated }
}

/** Reads filters and page from the URL query string; unknown or out-of-range values fall back to safe defaults. */
export function readCandidateFilters(params: Pick<URLSearchParams, 'get'>): CandidateListFilters & { page: number } {
  const occupation = params.get('occupation')?.trim() ?? ''
  return {
    keyword: params.get('keyword')?.trim() ?? '',
    location: params.get('location')?.trim() ?? '',
    skill: params.get('skill')?.trim() ?? '',
    occupation,
    includeRelated: Boolean(occupation) && parseBoolean(params.get('includeRelated')),
    level: parseCandidateLevel(params.get('level')),
    minYears: parseMinYears(params.get('minYears')),
    hasPortfolio: parseBoolean(params.get('hasPortfolio')),
    hasCertification: parseBoolean(params.get('hasCertification')),
    page: positiveInteger(params.get('page')) ?? 1,
  }
}

/** Builds the /candidates URL for a set of filters and a page; empty defaults and page 1 are omitted. */
export function buildCandidatesHref(pathname: string, filters: CandidateListFilters, page = 1): string {
  const url = new URLSearchParams()
  const keyword = filters.keyword.trim()
  const location = filters.location.trim()
  const skill = filters.skill.trim()
  const occupation = filters.occupation.trim()

  if (keyword) url.set('keyword', keyword)
  if (location) url.set('location', location)
  if (skill) url.set('skill', skill)
  if (occupation) {
    url.set('occupation', occupation)
    if (filters.includeRelated) url.set('includeRelated', 'true')
  }
  if (filters.level) url.set('level', filters.level)
  if (filters.minYears !== undefined && filters.minYears > 0) url.set('minYears', String(filters.minYears))
  if (filters.hasPortfolio) url.set('hasPortfolio', 'true')
  if (filters.hasCertification) url.set('hasCertification', 'true')
  if (page > 1) url.set('page', String(page))

  const search = url.toString()
  return search ? `${pathname}?${search}` : pathname
}

/** Converts parsed UI filters into the exact query object sent to usersApi.candidates. */
export function toCandidateSearchParams(
  filters: CandidateListFilters,
  page: number,
  pageSize = candidatesPageSize,
): CandidateDirectoryParams {
  const keyword = filters.keyword.trim()
  const location = filters.location.trim()
  const skill = filters.skill.trim()
  const occupation = filters.occupation.trim()

  return {
    page,
    pageSize,
    ...(keyword ? { keyword } : {}),
    ...(location ? { location } : {}),
    ...(skill ? { skill } : {}),
    ...occupationParams(occupation, filters.includeRelated),
    ...(filters.level ? { level: filters.level } : {}),
    ...(filters.minYears !== undefined && filters.minYears > 0 ? { minYears: filters.minYears } : {}),
    ...(filters.hasPortfolio ? { hasPortfolio: true } : {}),
    ...(filters.hasCertification ? { hasCertification: true } : {}),
  }
}

/** Counts active sidebar filters for the phone Filters button badge (excludes keyword). */
export function countActiveCandidateFilters(filters: CandidateListFilters): number {
  let count = 0
  if (filters.occupation.trim()) count += 1
  if (filters.level) count += 1
  if (filters.minYears !== undefined && filters.minYears > 0) count += 1
  if (filters.skill.trim()) count += 1
  if (filters.location.trim()) count += 1
  if (filters.hasPortfolio) count += 1
  if (filters.hasCertification) count += 1
  return count
}

/**
 * Decides what to do when a page past page 1 returns no candidates.
 * If the response tells us the total and at least one candidate exists, clamp to the last page.
 * Otherwise keep the user here and show an empty-page notice with a link back to page 1.
 */
export function resolveOutOfRangePage({
  page,
  itemCount,
  totalRow,
  totalPages,
  pageSize = candidatesPageSize,
}: {
  page: number
  itemCount: number
  totalRow?: number
  totalPages?: number
  pageSize?: number
}): { action: 'ok' } | { action: 'clamp'; targetPage: number } | { action: 'empty-page' } {
  if (itemCount > 0 || page <= 1) return { action: 'ok' }

  const knownLastPage =
    totalPages !== undefined
      ? totalPages
      : totalRow !== undefined
        ? Math.ceil(totalRow / pageSize)
        : undefined

  if (
    knownLastPage !== undefined &&
    knownLastPage >= 1 &&
    page > knownLastPage &&
    (totalRow === undefined || totalRow > 0)
  ) {
    return { action: 'clamp', targetPage: knownLastPage }
  }

  return { action: 'empty-page' }
}

function positiveInteger(value: string | null): number | undefined {
  if (!value || !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function parseMinYears(value: string | null): number | undefined {
  const parsed = positiveInteger(value)
  return parsed !== undefined && parsed <= 40 ? parsed : undefined
}

function parseCandidateLevel(value: string | null): '' | CandidateLevel {
  if (value === 'Junior' || value === 'Mid' || value === 'Senior') return value
  return ''
}

function parseBoolean(value: string | null): boolean {
  return value === 'true' || value === '1'
}
