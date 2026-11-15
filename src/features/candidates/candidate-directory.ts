import type { CandidateProfile } from '@/shared/schemas'

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

/** "3 years in Data" from the candidate's resume, or null when they have no resume yet. */
export function formatCandidateCareer(candidate: CandidateProfile) {
  const career = candidate.career
  if (!career?.careerField) return null
  if (career.yearsInField == null) return career.careerField
  const years = Math.round(career.yearsInField * 10) / 10
  return `${years} ${years === 1 ? 'year' : 'years'} in ${career.careerField}`
}
