import { occupationLabel } from '@/features/occupations/api'
import { formatCredit, formatYears } from '@/features/users/resume-career'
import type { CandidateDirectoryParams, CandidateProfile } from '@/shared/schemas'

export function getCandidateSkillNames(candidate: CandidateProfile) {
  return (candidate.profileSkills ?? [])
    .map((skill) => skill.name.trim())
    .filter(Boolean)
}

export function getCandidateSummary(candidate: CandidateProfile) {
  return candidate.bio?.trim() || candidate.headline?.trim() || 'Profile summary is not available yet.'
}

export function getCandidateLocation(candidate: CandidateProfile) {
  return candidate.location?.trim() || 'Location not listed'
}

export function formatCandidateRating(candidate: CandidateProfile) {
  return candidate.stats.rating > 0 ? candidate.stats.rating.toFixed(1) : 'New'
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

/** The occupation part of the candidate search: the code, and its related occupations only when one is chosen. */
export function occupationParams(occupation: string, includeRelated: boolean): Pick<CandidateDirectoryParams, 'occupation' | 'includeRelated'> {
  if (!occupation) return {}
  return { occupation, includeRelated }
}
