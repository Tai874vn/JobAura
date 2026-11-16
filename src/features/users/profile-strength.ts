'use client'

import { useQuery } from '@tanstack/react-query'
import { hiringPostsApi, jobsApi } from '@/shared/api/endpoints'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'
import type { UserProfile, UserResume } from '@/shared/schemas'
import { isCareerField, parseResumeJobs } from './resume-career'

/**
 * Profile strength: weighted checks that add up to 100. Only what changes how the profile works counts:
 * candidates are weighted toward the resume (the AI needs its field and years to place them), recruiters toward
 * who they are and having a hiring post. Website, certifications, and a cover image are extras and don't count.
 * The backend computes the same table for candidate cards (NestjsBE users/services/profile-strength.ts); keep the
 * two in step.
 */
/** `href` opens the place to fill the item in; settings links carry `focus`, the field to scroll to. */
export type StrengthCheck = { label: string; weight: number; earned: number; hint: string; href: string }
export type ProfileStrength = { score: number; checks: StrengthCheck[]; missing: StrengthCheck[] }

export type StrengthInput = {
  profile: Pick<UserProfile, 'role' | 'headline' | 'bio' | 'location' | 'website' | 'avatar' | 'skills' | 'profileSkills' | 'portfolio' | 'portfolioItems'>
  resume?: UserResume | null
  portfolioPosts?: number
  hiringPosts?: number
}

export const SKILLS_FOR_FULL_CREDIT = 5

const filled = (value?: string | null) => Boolean(value?.trim())

const profileField = (focus: string) => `/settings?section=profile&focus=${focus}`
const resumeField = (focus: string) => `/settings?section=resume&focus=${focus}`

function check(label: string, weight: number, done: boolean | number, hint: string, href: string): StrengthCheck {
  const share = typeof done === 'number' ? Math.min(Math.max(done, 0), 1) : done ? 1 : 0
  return { label, weight, earned: weight * share, hint, href }
}

export function profileStrength({ profile, resume, portfolioPosts = 0, hiringPosts = 0 }: StrengthInput): ProfileStrength {
  let checks: StrengthCheck[]
  if (profile.role === 'employer') {
    checks = [
      check('Headline', 20, filled(profile.headline), 'Add a headline', profileField('headline')),
      check('Photo', 20, filled(profile.avatar), 'Add a profile photo or logo', profileField('photo')),
      check('About', 20, filled(profile.bio), 'Describe your company or team', profileField('bio')),
      check('Location', 10, filled(profile.location), 'Add your location', profileField('location')),
      check('Website', 10, filled(profile.website), 'Add your company website', profileField('website')),
      check('Hiring post', 20, hiringPosts > 0, 'Publish a hiring post', '/my-hiring-posts'),
    ]
  } else {
    const data = resume?.data
    const skills = (profile.profileSkills ?? profile.skills ?? []).length
    const portfolio = (profile.portfolioItems ?? profile.portfolio ?? []).length + portfolioPosts
    const jobs = parseResumeJobs(data?.Jobs)
    const datedJob = jobs.some((job) => filled(job.title) && filled(job.start))
    const hasField = isCareerField(data?.Industry)
    // Same rule as the backend's yearsInField: dated jobs in the main field, else the Years experience box.
    const declaredYears = Number((data?.YearsExperience ?? '').trim().replace(',', '.'))
    const hasYears = jobs.some((job) => job.field === data?.Industry && filled(job.start))
      || (filled(data?.YearsExperience) && Number.isFinite(declaredYears) && declaredYears >= 0)
    const missingSkills = SKILLS_FOR_FULL_CREDIT - skills
    checks = [
      check('Career field and years', 25, hasField && hasYears,
        'Add your main field and years of experience to your resume', resumeField(hasField ? 'years' : 'career')),
      check('Work history', 10, datedJob, 'Add a job with dates to your resume', resumeField('jobs')),
      check('Skills', 15, skills >= SKILLS_FOR_FULL_CREDIT ? 1 : skills > 0 ? 0.5 : 0,
        skills > 0 ? `Add ${missingSkills} more ${missingSkills === 1 ? 'skill' : 'skills'}` : `Add at least ${SKILLS_FOR_FULL_CREDIT} skills`,
        profileField('skills')),
      check('Headline', 10, filled(profile.headline), 'Add a headline', profileField('headline')),
      check('Photo', 10, filled(profile.avatar), 'Add a profile photo', profileField('photo')),
      check('About', 10, filled(profile.bio), 'Write a short About', profileField('bio')),
      check('Portfolio', 10, portfolio > 0, 'Add a portfolio post', profileField('portfolio')),
      check('Education', 5, filled(data?.Degree) && (data?.Degree === 'Not stated' || filled(data?.FieldOfStudy)),
        'Add your degree and field of study', resumeField('education')),
      check('Location', 5, filled(profile.location), 'Add your location', profileField('location')),
    ]
  }
  const score = Math.round(checks.reduce((sum, item) => sum + item.earned, 0))
  return { score, checks, missing: checks.filter((item) => item.earned < item.weight) }
}

/** Strength of the signed-in user's own profile; loads the resume or post counts it needs. */
export function useProfileStrength(profile: StrengthInput['profile'] & { id: number }, enabled = true) {
  const isEmployer = profile.role === 'employer'
  const countParams = { page: 1, pageSize: 1 }
  const resume = useQuery({ queryKey: queryKeys.myResume, queryFn: usersApi.myResume, enabled: enabled && !isEmployer, retry: false })
  const posts = useQuery({
    queryKey: queryKeys.jobsByCreator(profile.id, countParams),
    queryFn: () => jobsApi.byCreator(profile.id, countParams),
    enabled: enabled && !isEmployer,
  })
  const hiring = useQuery({
    queryKey: queryKeys.myHiringPosts(countParams),
    queryFn: () => hiringPostsApi.mine(countParams),
    enabled: enabled && isEmployer,
  })
  const count = (content?: { totalRow?: number; data?: unknown[] } | null) => content?.totalRow ?? content?.data?.length ?? 0
  return profileStrength({
    profile,
    resume: resume.data?.content ?? null,
    portfolioPosts: count(posts.data?.content),
    hiringPosts: count(hiring.data?.content),
  })
}
