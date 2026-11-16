import { describe, expect, it } from 'vitest'
import { profileStrength } from './profile-strength'
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
  Industry: 'Software Engineering', YearsExperience: '4', Degree: 'Bachelor', FieldOfStudy: '0613',
  Jobs: [{ title: 'Developer', field: 'Software Engineering', start: '2021-01', end: '', current: true, description: '' }],
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
