import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/shared/api/client'
import { usersApi } from '@/shared/api/endpoints/users'
import {
  buildCandidatesHref,
  candidateCardActions,
  candidateCardFacts,
  countActiveCandidateFilters,
  formatCandidateCareer,
  formatCandidateDegree,
  getCandidateSkillNames,
  minYearsLabel,
  occupationParams,
  readCandidateFilters,
  resolveOutOfRangePage,
  toCandidateSearchParams,
} from '../candidate-directory'
import type { CandidateProfile } from '@/shared/schemas'

const params = (search: string) => new URLSearchParams(search)

const baseCandidate = (overrides: Partial<CandidateProfile> = {}): CandidateProfile => ({
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
  career: {
    occupationCode: '2513.5',
    occupationTitle: 'web developer',
    specialty: 'Full Stack Developer',
    level: 'Mid',
    yearsInOccupation: 3,
    relatedYears: 0.3,
    legacyField: null,
  },
  profileStrength: 82,
  match: {
    score: 0.84,
    label: 'high_match',
    keywordScore: 1,
    skillScore: 1,
    locationScore: 1,
    qualityScore: 0.76,
  },
  ...overrides,
})

describe('candidate directory data', () => {
  const candidate = baseCandidate()

  it('reads candidate skills from backend profile skills', () => {
    expect(getCandidateSkillNames(candidate)).toEqual(['Python', 'FastAPI'])
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

  it('words the minimum-years filter like the card: years as the chosen occupation', () => {
    const card = formatCandidateCareer(candidate(career({ yearsInOccupation: 3 })))
    expect(card?.years).toBe('3 yr as Web developer')
    expect(minYearsLabel('Web developer')).toBe('Years as Web developer')
    expect(minYearsLabel(null)).toBe('Years in the occupation')
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

describe('formatCandidateDegree and candidateCardFacts', () => {
  it('reads degree when stated and skips empty or Not stated values', () => {
    expect(formatCandidateDegree({ education: { degree: 'Bachelor', fieldOfStudy: '0613' } })).toBe('Bachelor')
    expect(formatCandidateDegree({ education: { degree: 'Not stated', fieldOfStudy: null } })).toBeNull()
    expect(formatCandidateDegree({ education: null })).toBeNull()
    expect(formatCandidateDegree({})).toBeNull()
  })

  it('builds structured facts for a candidate with a resume, related years, location and degree', () => {
    const facts = candidateCardFacts(
      baseCandidate({
        location: 'Ho Chi Minh City',
        education: { degree: 'Master or higher', fieldOfStudy: '0613' },
      }),
    )

    expect(facts).toEqual({
      hasResume: true,
      occupation: 'Web developer',
      specialty: 'Full Stack Developer',
      occupationNotice: null,
      level: 'Mid',
      years: '3 yr as Web developer',
      relatedYears: '+0.3 yr related',
      location: 'Ho Chi Minh City',
      degree: 'Master or higher',
      facts: ['3 yr as Web developer', '+0.3 yr related', 'Ho Chi Minh City'],
    })
  })

  it('marks hasResume false and omits empty resume facts when the candidate has no resume', () => {
    const facts = candidateCardFacts(
      baseCandidate({ career: null, location: null, education: null }),
    )

    expect(facts).toEqual({
      hasResume: false,
      occupation: null,
      specialty: null,
      occupationNotice: null,
      level: null,
      years: null,
      relatedYears: null,
      location: null,
      degree: null,
      facts: [],
    })
  })

  it('builds a notice for a resume saved before occupations', () => {
    const facts = candidateCardFacts(
      baseCandidate({
        career: {
          occupationCode: null,
          occupationTitle: null,
          specialty: null,
          level: null,
          yearsInOccupation: null,
          relatedYears: null,
          legacyField: 'Data',
        },
        location: 'Hanoi',
      }),
    )

    expect(facts.hasResume).toBe(true)
    expect(facts.occupation).toBeNull()
    expect(facts.occupationNotice).toBe('Previously: Data · no occupation chosen yet')
    expect(facts.facts).toEqual(['Hanoi'])
  })
})

describe('candidateCardActions', () => {
  it('shows View profile, Message and Connect for an employer or admin viewing another user', () => {
    expect(candidateCardActions({ id: 10 }, { id: 99, role: 'employer' })).toEqual({
      viewProfile: true,
      message: true,
      connect: true,
    })
    expect(candidateCardActions({ id: 10 }, { id: 1, role: 'admin' })).toEqual({
      viewProfile: true,
      message: true,
      connect: true,
    })
  })

  it('hides Message and Connect when viewing your own card or when signed out', () => {
    expect(candidateCardActions({ id: 10 }, { id: 10, role: 'admin' })).toEqual({
      viewProfile: true,
      message: false,
      connect: false,
    })
    expect(candidateCardActions({ id: 10 }, null)).toEqual({
      viewProfile: true,
      message: false,
      connect: false,
    })
  })
})

describe('readCandidateFilters, buildCandidatesHref and toCandidateSearchParams', () => {
  it('reads URL params and ignores invalid or out-of-range values', () => {
    expect(
      readCandidateFilters(
        params('keyword= python &location=Hanoi&skill=React&occupation=2513.5&includeRelated=true&level=Senior&minYears=5&hasPortfolio=true&page=2'),
      ),
    ).toEqual({
      keyword: 'python',
      location: 'Hanoi',
      skill: 'React',
      occupation: '2513.5',
      includeRelated: true,
      level: 'Senior',
      minYears: 5,
      hasPortfolio: true,
      hasCertification: false,
      page: 2,
    })

    // includeRelated without occupation, invalid level, minYears > 40 or 0, and invalid page fall back cleanly.
    expect(
      readCandidateFilters(params('includeRelated=true&level=Principal&minYears=99&page=0')),
    ).toEqual({
      keyword: '',
      location: '',
      skill: '',
      occupation: '',
      includeRelated: false,
      level: '',
      minYears: undefined,
      hasPortfolio: false,
      hasCertification: false,
      page: 1,
    })
  })

  it('builds a clean URL omitting empty defaults and page 1', () => {
    const empty = {
      keyword: '',
      location: '',
      skill: '',
      occupation: '',
      includeRelated: true,
      level: '' as const,
      minYears: undefined,
      hasPortfolio: false,
      hasCertification: false,
    }
    expect(buildCandidatesHref('/candidates', empty, 1)).toBe('/candidates')

    expect(
      buildCandidatesHref(
        '/candidates',
        {
          keyword: ' Backend ',
          location: 'Remote',
          skill: 'Python',
          occupation: '2513.5',
          includeRelated: true,
          level: 'Mid',
          minYears: 3,
          hasPortfolio: true,
          hasCertification: false,
        },
        3,
      ),
    ).toBe(
      '/candidates?keyword=Backend&location=Remote&skill=Python&occupation=2513.5&includeRelated=true&level=Mid&minYears=3&hasPortfolio=true&page=3',
    )
  })

  it('maps UI filters to the usersApi.candidates request payload', () => {
    expect(
      toCandidateSearchParams(
        {
          keyword: 'Lina',
          location: 'Remote',
          skill: 'Python',
          occupation: '2513.5',
          includeRelated: true,
          level: 'Senior',
          minYears: 4,
          hasPortfolio: false,
          hasCertification: true,
        },
        2,
      ),
    ).toEqual({
      page: 2,
      pageSize: 12,
      keyword: 'Lina',
      location: 'Remote',
      skill: 'Python',
      occupation: '2513.5',
      includeRelated: true,
      level: 'Senior',
      minYears: 4,
      hasCertification: true,
    })
  })

  it('counts active sidebar filters without counting keyword', () => {
    expect(
      countActiveCandidateFilters({
        keyword: 'React',
        location: '',
        skill: '',
        occupation: '',
        includeRelated: false,
        level: '',
        minYears: undefined,
        hasPortfolio: false,
        hasCertification: false,
      }),
    ).toBe(0)

    expect(
      countActiveCandidateFilters({
        keyword: 'React',
        location: 'Hanoi',
        skill: 'TypeScript',
        occupation: '2513.5',
        includeRelated: true,
        level: 'Mid',
        minYears: 3,
        hasPortfolio: false,
        hasCertification: false,
      }),
    ).toBe(5)
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

describe('resolveOutOfRangePage', () => {
  it('stays ok on page 1 or whenever the page has candidates', () => {
    expect(resolveOutOfRangePage({ page: 1, itemCount: 0, totalRow: 0, totalPages: 1 })).toEqual({ action: 'ok' })
    expect(resolveOutOfRangePage({ page: 2, itemCount: 5, totalRow: 17, totalPages: 2 })).toEqual({ action: 'ok' })
  })

  it('clamps to the last page when the total is known and candidates exist', () => {
    expect(resolveOutOfRangePage({ page: 99, itemCount: 0, totalRow: 25, totalPages: 3 })).toEqual({
      action: 'clamp',
      targetPage: 3,
    })
    expect(resolveOutOfRangePage({ page: 5, itemCount: 0, totalRow: 25 })).toEqual({
      action: 'clamp',
      targetPage: 3,
    })
  })

  it('shows an empty-page state when the total is unknown or zero', () => {
    expect(resolveOutOfRangePage({ page: 99, itemCount: 0 })).toEqual({ action: 'empty-page' })
    expect(resolveOutOfRangePage({ page: 99, itemCount: 0, totalRow: 0, totalPages: 1 })).toEqual({
      action: 'empty-page',
    })
  })
})
