import type { Job, UserProfile } from '@/shared/schemas'

type ProfileCompletionInput = Pick<
  UserProfile,
  'name' | 'headline' | 'bio' | 'location' | 'website' | 'avatar' | 'cover' | 'coverImage' | 'skills' | 'profileSkills' | 'certifications' | 'profileCertifications' | 'portfolio' | 'portfolioItems'
>

export function getUserPosts(jobs: Job[], userId: number | undefined) {
  if (!userId) return []

  return jobs
    .filter((job) => job.creatorId === userId || job.user?.id === userId)
    .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
}

export function calculateProfileCompletion(profile: ProfileCompletionInput) {
  const skills = profile.profileSkills ?? profile.skills
  const certifications = profile.profileCertifications ?? profile.certifications
  const portfolio = profile.portfolioItems ?? profile.portfolio
  const checks = [
    Boolean(profile.name?.trim()),
    Boolean(profile.headline?.trim()),
    Boolean(profile.bio?.trim()),
    Boolean(profile.location?.trim()),
    Boolean(profile.website?.trim()),
    Boolean(profile.avatar?.trim()),
    Boolean((profile.coverImage ?? profile.cover)?.trim()),
    Boolean(skills?.length),
    Boolean(certifications?.length),
    Boolean(portfolio?.length),
  ]

  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function getTime(value?: string) {
  if (!value) return 0
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}
