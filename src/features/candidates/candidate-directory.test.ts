import { describe, expect, it } from 'vitest'
import { getCandidateSummary, getCandidateSkillNames } from './candidate-directory'
import type { CandidateProfile } from '@/shared/schemas'

describe('candidate directory data', () => {
  const candidate: CandidateProfile = {
    id: 10,
    name: 'Lina Tran',
    avatar: null,
    headline: 'Senior Backend Engineer',
    bio: 'Builds Python APIs',
    location: 'Remote',
    profileSkills: [
      { id: 1, name: 'Python', level: 'advanced' },
      { id: 2, name: 'FastAPI', level: null },
    ],
    stats: {
      portfolioItems: 2,
      certifications: 1,
      completedWork: 4,
      rating: 4.8,
    },
    match: {
      score: 0.84,
      label: 'high_match',
      keywordScore: 1,
      skillScore: 1,
      locationScore: 1,
      qualityScore: 0.76,
    },
  }

  it('reads candidate skills from backend profile skills', () => {
    expect(getCandidateSkillNames(candidate)).toEqual(['Python', 'FastAPI'])
  })

  it('uses bio as the card summary and falls back to headline', () => {
    expect(getCandidateSummary(candidate)).toBe('Builds Python APIs')
    expect(getCandidateSummary({ ...candidate, bio: null })).toBe('Senior Backend Engineer')
  })
})
