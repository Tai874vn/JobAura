import { describe, expect, it } from 'vitest'
import { hiddenFromRecruitersReason, isHiddenFromRecruiters, joinWords, profileStrength, recruiterVisibilityGaps } from './profile-strength'
import type { UserResume } from '@/shared/schemas'

const resume = (data: Record<string, unknown>) => ({ data }) as unknown as UserResume
const fullCandidate = {
  role: 'user' as const,
  headline: 'Backend developer',
  bio: 'Builds reliable services.',
  location: 'Hanoi',
  avatar: '/avatar.png',
  profileSkills: ['Java', 'SQL', 'Docker', 'Spring', 'Git'].map((name) => ({ name })),
}
const fullResume = resume({
  Industry: 'Software development', YearsExperience: '4', Degree: 'Bachelor', FieldOfStudy: '0613',
  Jobs: [{ title: 'Developer', field: 'Software development', start: '2021-01', end: '', current: true, description: '' }],
})

describe('profileStrength', () => {
  it('reaches 100 for a candidate without website, certifications, or cover', () => {
    const result = profileStrength({ profile: fullCandidate, resume: fullResume, portfolioPosts: 1 })
    expect(result.score).toBe(100)
    expect(result.missing).toEqual([])
  })

  it('weights the resume field and years most for candidates', () => {
    const noResume = profileStrength({ profile: fullCandidate, resume: null, portfolioPosts: 1 })
    expect(noResume.score).toBe(60)
    expect(noResume.missing.map((item) => item.label)).toEqual(['Career field and years', 'Work history', 'Education'])
  })

  it('gives half the skills credit below five skills and says how many are missing', () => {
    const result = profileStrength({
      profile: { ...fullCandidate, profileSkills: [{ name: 'Java' }, { name: 'SQL' }] },
      resume: fullResume, portfolioPosts: 1,
    })
    expect(result.score).toBe(93)
    expect(result.missing[0].hint).toBe('Add 3 more skills')
  })

  it('accepts "Not stated" as a complete education answer', () => {
    const result = profileStrength({
      profile: fullCandidate, portfolioPosts: 1,
      resume: resume({ ...fullResume.data, Degree: 'Not stated', FieldOfStudy: '' }),
    })
    expect(result.score).toBe(100)
  })

  it('scores recruiters on identity and a hiring post, not a resume', () => {
    const recruiter = { role: 'employer' as const, headline: 'Hiring at Acme', bio: 'We build tools.', location: 'Hanoi', website: 'https://acme.example', avatar: '/logo.png' }
    expect(profileStrength({ profile: recruiter, hiringPosts: 1 }).score).toBe(100)
    expect(profileStrength({ profile: recruiter }).missing.map((item) => item.label)).toEqual(['Hiring post'])
    expect(profileStrength({ profile: { role: 'employer' } }).score).toBe(0)
  })
})

describe('profileStrength links', () => {
  it('sends each missing item to the field that fills it', () => {
    const result = profileStrength({ profile: { role: 'user' }, resume: null })
    const href = (label: string) => result.missing.find((item) => item.label === label)?.href
    expect(href('Career field and years')).toBe('/settings?section=resume&focus=career')
    expect(href('Skills')).toBe('/settings?section=profile&focus=skills')
    expect(href('Education')).toBe('/settings?section=resume&focus=education')
  })

  it('points at years once the field is chosen, and recruiters at their hiring posts', () => {
    const withField = profileStrength({ profile: { role: 'user' }, resume: resume({ Industry: 'Software development' }) })
    expect(withField.missing[0].href).toBe('/settings?section=resume&focus=years')
    expect(profileStrength({ profile: { role: 'employer' } }).missing.at(-1)?.href).toBe('/my-hiring-posts')
  })
})

describe('profileStrength career years', () => {
  const profile = { role: 'user' as const }
  const career = (result: ReturnType<typeof profileStrength>) => result.missing.some((item) => item.label === 'Career field and years')

  it('counts years from dated jobs in the main field, as the backend does', () => {
    const jobs = [{ title: 'Developer', field: 'Software development', start: '2020-01', end: '', current: true, description: '' }]
    expect(career(profileStrength({ profile, resume: resume({ Industry: 'Software development', Jobs: jobs }) }))).toBe(false)
  })

  it('needs a field from the list and a number of years', () => {
    expect(career(profileStrength({ profile, resume: resume({ Industry: 'Rocket surgery', YearsExperience: '3' }) }))).toBe(true)
    expect(career(profileStrength({ profile, resume: resume({ Industry: 'Software development', YearsExperience: 'many' }) }))).toBe(true)
    expect(career(profileStrength({ profile, resume: resume({ Industry: 'Software development', YearsExperience: '3' }) }))).toBe(false)
  })
})

describe('recruiterVisibilityGaps', () => {
  it('lists what the backend requires before recruiters can find a candidate', () => {
    expect(recruiterVisibilityGaps({ name: 'Ava' })).toEqual(['a profile photo', 'a headline', 'an About', 'a skill'])
    expect(recruiterVisibilityGaps({ name: 'Ava', avatar: '/a.png', headline: 'Dev', bio: 'Builds', profileSkills: [{ name: 'SQL' }] })).toEqual([])
    expect(joinWords(['a photo', 'a headline', 'a skill'])).toBe('a photo, a headline, and a skill')
    expect(joinWords(['a photo', 'a skill'])).toBe('a photo and a skill')
  })
})

describe('isHiddenFromRecruiters', () => {
  it('follows the backend flag, not the rule alone', () => {
    expect(isHiddenFromRecruiters({ role: 'user', candidateDiscoverable: true, profileCompleted: true })).toBe(false)
    expect(isHiddenFromRecruiters({ role: 'user', candidateDiscoverable: true, profileCompleted: false })).toBe(true)
    expect(isHiddenFromRecruiters({ role: 'user', candidateDiscoverable: false, profileCompleted: false })).toBe(false)
    expect(hiddenFromRecruitersReason({ name: 'Ava', avatar: '/a.png', headline: 'Dev', bio: 'x', profileSkills: [] })).toBe('add a skill')
    expect(hiddenFromRecruitersReason({ name: 'Ava', avatar: '/a.png', headline: 'Dev', bio: 'x', profileSkills: [{ name: 'SQL' }] }))
      .toBe('save your profile once more')
  })
})
