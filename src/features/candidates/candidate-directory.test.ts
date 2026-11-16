import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/shared/api/client'
import { usersApi } from '@/shared/api/endpoints/users'
import { formatCandidateCareer, getCandidateSummary, getCandidateSkillNames, occupationParams } from './candidate-directory'
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
      listedServices: 0,
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

describe('formatCandidateCareer', () => {
  const candidate = (career: CandidateProfile['career']) => ({ career }) as CandidateProfile
  const career = (change: Partial<NonNullable<CandidateProfile['career']>> = {}) => ({
    occupationCode: '2513.5', occupationTitle: 'web developer', specialty: 'Full Stack Developer', level: 'Mid',
    yearsInOccupation: 3, relatedYears: 0.3, legacyField: null, ...change,
  })

  it('shows the occupation, the specialty, years in the occupation and related years separately', () => {
    expect(formatCandidateCareer(candidate(career()))).toEqual({
      occupation: 'Web developer', previously: null, specialty: 'Full Stack Developer',
      years: '3 yr as Web developer', related: '+0.3 yr related',
    })
    expect(formatCandidateCareer(candidate(career({ yearsInOccupation: 2.5, relatedYears: 0 })))).toMatchObject({
      years: '2.5 yr as Web developer', related: null,
    })
  })

  it('shows no years for a resume with no saved prediction', () => {
    expect(formatCandidateCareer(candidate(career({ level: null, yearsInOccupation: null, relatedYears: null }))))
      .toMatchObject({ occupation: 'Web developer', years: null, related: null })
  })

  it('shows the old field of a resume saved before occupations', () => {
    expect(formatCandidateCareer(candidate(career({ occupationCode: null, occupationTitle: null, specialty: null, legacyField: 'Data' }))))
      .toEqual({ occupation: null, previously: 'Data', specialty: null, years: null, related: null })
  })

  it('returns nothing without a resume', () => {
    expect(formatCandidateCareer(candidate(null))).toBeNull()
  })
})

describe('candidate filter by occupation', () => {
  const originalAdapter = apiClient.defaults.adapter
  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter
  })

  it('sends occupation and includeRelated only when an occupation is chosen', () => {
    expect(occupationParams('', true)).toEqual({})
    expect(occupationParams('2513.5', false)).toEqual({ occupation: '2513.5', includeRelated: false })
    expect(occupationParams('2513.5', true)).toEqual({ occupation: '2513.5', includeRelated: true })
  })

  it('the request carries occupation and includeRelated, and no careerField', async () => {
    const seen: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = async (config) => {
      seen.push(config)
      return { data: { message: 'ok', content: { data: [] } }, status: 200, statusText: 'OK', headers: {}, config }
    }
    await usersApi.candidates({ page: 1, pageSize: 12, ...occupationParams('2513.5', true) })
    await usersApi.candidates({ page: 1, pageSize: 12, ...occupationParams('2513.5', false) })
    expect(seen.map((request) => request.params)).toEqual([
      { page: 1, pageSize: 12, occupation: '2513.5', includeRelated: true },
      { page: 1, pageSize: 12, occupation: '2513.5', includeRelated: false },
    ])
  })
})
