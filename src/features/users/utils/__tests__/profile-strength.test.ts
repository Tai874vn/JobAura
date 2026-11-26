import { describe, expect, it } from 'vitest'
import { profileStrength } from '../profile-strength'
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
  Occupation: '2513.5', Degree: 'Bachelor', FieldOfStudy: '0613',
  Jobs: [{ title: 'Developer', occupation: '2513.5', start: '2021-01', end: '', current: true, description: '' }],
})

describe('profileStrength', () => {
  it('reaches 100 for a candidate without website, certifications, or cover', () => {
    const result = profileStrength({ profile: fullCandidate, resume: fullResume, portfolioPosts: 1 })
    expect(result.score).toBe(100)
    expect(result.missing).toEqual([])
  })

  it('weights the resume occupation and years most for candidates', () => {
    const noResume = profileStrength({ profile: fullCandidate, resume: null, portfolioPosts: 1 })
    expect(noResume.score).toBe(60)
    expect(noResume.missing.map((item) => item.label)).toEqual(['Occupation', 'Work history', 'Education'])
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
    expect(href('Occupation')).toBe('/settings?section=resume&focus=career')
    expect(href('Skills')).toBe('/settings?section=profile&focus=skills')
    expect(href('Education')).toBe('/settings?section=resume&focus=education')
  })

  it('points at the jobs once the occupation is chosen, and recruiters at their hiring posts', () => {
    const withField = profileStrength({ profile: { role: 'user' }, resume: resume({ Occupation: '2513.5' }) })
    expect(withField.missing[0].href).toBe('/settings?section=resume&focus=jobs')
    expect(profileStrength({ profile: { role: 'employer' } }).missing.at(-1)?.href).toBe('/my-hiring-posts')
  })
})

describe('profileStrength career years', () => {
  const profile = { role: 'user' as const }
  const career = (result: ReturnType<typeof profileStrength>) => result.missing.some((item) => item.label === 'Occupation')

  it('counts an occupation with dated jobs in it, as the backend does', () => {
    const jobs = [{ title: 'Developer', occupation: '2513.5', start: '2020-01', end: '', current: true, description: '' }]
    expect(career(profileStrength({ profile, resume: resume({ Occupation: '2513.5', Jobs: jobs }) }))).toBe(false)
  })

  it('needs an occupation from the catalogue; years are counted from the jobs, so no number is asked for', () => {
    expect(career(profileStrength({ profile, resume: resume({ Occupation: 'Rocket surgery' }) }))).toBe(true)
    expect(career(profileStrength({ profile, resume: resume({ Occupation: '2513.5' }) }))).toBe(false)
  })

  it('asks a resume saved before occupations for one, without losing its credit elsewhere', () => {
    const legacy = resume({ LegacyField: 'Software development', Degree: 'Bachelor', FieldOfStudy: '0613',
      Jobs: [{ title: 'Developer', occupation: '', legacyField: 'Software development', start: '2021-01', end: '', current: true, description: '' }] })
    const result = profileStrength({ profile: fullCandidate, resume: legacy, portfolioPosts: 1 })
    expect(result.missing.map((item) => item.label)).toEqual(['Occupation'])
    expect(result.score).toBe(75)
  })
})
