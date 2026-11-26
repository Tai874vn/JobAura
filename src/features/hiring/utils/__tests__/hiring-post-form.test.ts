import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/shared/api/client'
import { hiringPostsApi } from '@/shared/api/endpoints/hiring-posts'
import { draftFromPost, emptyHiringPostDraft, hiringPostPayload, postOccupation, type HiringPostDraft } from '../hiring-post-form'

const now = new Date('2026-11-15T10:00:00')
// Web developer (2513.5) and some of its specialties, from the backend catalogue.
const webSpecialties = ['Back End Developer', 'Front End Developer', 'Full Stack Developer']
const draft = (change: Partial<HiringPostDraft> = {}): HiringPostDraft => ({
  ...emptyHiringPostDraft,
  title: 'Backend Engineer',
  occupationCode: '2513.5',
  specialty: 'Back End Developer',
  yearsRequired: '3',
  description: 'Build and run the APIs behind our hiring platform.',
  skills: ['Node.js', 'PostgreSQL'],
  ...change,
})

const originalAdapter = apiClient.defaults.adapter
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter
})
function answer(body: unknown, seen: InternalAxiosRequestConfig[]): AxiosAdapter {
  return async (config) => {
    seen.push(config)
    return { data: body, status: 200, statusText: 'OK', headers: {}, config }
  }
}

describe('hiringPostPayload', () => {
  it('sends the occupation code and specialty, with numbers and optional fields left out', () => {
    const result = hiringPostPayload(draft({ companyName: '  ', salaryMin: '1500' }), now, webSpecialties)
    expect(result.error).toBeUndefined()
    expect(result.data).toMatchObject({
      title: 'Backend Engineer', occupationCode: '2513.5', specialty: 'Back End Developer', yearsRequired: 3,
      skills: ['Node.js', 'PostgreSQL'], salaryMin: 1500, employmentType: 'Full-time',
    })
    expect(result.data?.companyName).toBeUndefined()
    // The backend rejects unknown keys: the old field is never sent.
    expect(result.data).not.toHaveProperty('careerField')
    expect(result.data).not.toHaveProperty('legacyField')
  })

  it('sends an empty specialty as null, so an edit clears it', () => {
    expect(hiringPostPayload(draft({ specialty: '' }), now).data?.specialty).toBeNull()
  })

  it('requires the occupation and the required years', () => {
    expect(hiringPostPayload(draft({ occupationCode: '', specialty: '' }), now).error).toBe('Choose the occupation')
    expect(hiringPostPayload(draft({ yearsRequired: '' }), now).error).toMatch(/years/i)
  })

  it('accepts only a specialty listed under the occupation, once the list is known', () => {
    expect(hiringPostPayload(draft({ specialty: 'Ninja coder' }), now, webSpecialties).error)
      .toBe('Choose a specialty listed under the occupation')
    expect(hiringPostPayload(draft({ occupationCode: '' }), now).error).toBe('Choose the occupation before its specialty')
  })

  it('makes a post saved before occupations choose one; the old field is never sent', () => {
    const legacy = draft({ occupationCode: '', specialty: '', legacyField: 'Software development' })
    expect(hiringPostPayload(legacy, now).error).toBe('Choose the occupation')
    const picked = hiringPostPayload({ ...legacy, occupationCode: '2513.5' }, now)
    expect(picked.data?.occupationCode).toBe('2513.5')
    expect(picked.data).not.toHaveProperty('legacyField')
  })

  it('rejects a closing date in the past and sends the end of the chosen day', () => {
    expect(hiringPostPayload(draft({ closesAt: '2026-11-14' }), now).error).toMatch(/closing date/)
    const result = hiringPostPayload(draft({ closesAt: '2026-11-30' }), now)
    expect(new Date(result.data?.closesAt ?? '').getDate()).toBe(30)
  })

  it('rejects a maximum salary below the minimum', () => {
    expect(hiringPostPayload(draft({ salaryMin: '3000', salaryMax: '1000' }), now).error).toMatch(/Maximum salary/)
  })
})

describe('openings in the form', () => {
  it('a new post hires 1 person by default', () => {
    expect(emptyHiringPostDraft).toMatchObject({ openings: '1', keepHiring: false })
    expect(hiringPostPayload(draft(), now).data?.openings).toBe(1)
  })

  it('sends the number typed, 1 to 50', () => {
    expect(hiringPostPayload(draft({ openings: '50' }), now).data?.openings).toBe(50)
    expect(hiringPostPayload(draft({ openings: ' 3 ' }), now).data?.openings).toBe(3)
  })

  it('refuses a number outside 1 to 50, a fraction, or an empty box', () => {
    for (const openings of ['0', '51', '2.5', '', 'abc', '-1']) {
      expect(hiringPostPayload(draft({ openings }), now).error).toBe('Openings must be a whole number from 1 to 50')
    }
  })

  it('"Keep hiring until I close the post" sends null and ignores the number box', () => {
    const result = hiringPostPayload(draft({ keepHiring: true, openings: '' }), now)
    expect(result.error).toBeUndefined()
    expect(result.data?.openings).toBeNull()
  })

  it('opens a saved post with its openings; null means keep hiring', () => {
    const post = { id: 1, recruiterId: 2, title: 'QA', description: 'Test the product end to end.', skills: [], status: 'OPEN' as const, applicationCount: 0, viewerHasApplied: false }
    expect(draftFromPost({ ...post, openings: 4 })).toMatchObject({ openings: '4', keepHiring: false })
    expect(draftFromPost({ ...post, openings: null })).toMatchObject({ openings: '1', keepHiring: true })
    // An older card without the number is treated as 1 opening.
    expect(draftFromPost(post)).toMatchObject({ openings: '1', keepHiring: false })
  })
})

describe('hiring post requests', () => {
  it('create and update send occupationCode and specialty, and no careerField', async () => {
    const seen: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = answer({ message: 'ok', content: null }, seen)
    const data = hiringPostPayload(draft(), now, webSpecialties).data!
    await hiringPostsApi.create(data)
    await hiringPostsApi.update(7, data)
    for (const request of seen) {
      const body = JSON.parse(request.data as string)
      expect(body).toMatchObject({ occupationCode: '2513.5', specialty: 'Back End Developer', yearsRequired: 3 })
      expect(body).not.toHaveProperty('careerField')
    }
    expect(seen.map((request) => `${request.method} ${request.url}`)).toEqual(['post /api/hiring-posts', 'patch /api/hiring-posts/7'])
  })

  it('the open-posts filter sends occupation, not careerField', async () => {
    const seen: InternalAxiosRequestConfig[] = []
    apiClient.defaults.adapter = answer({ message: 'ok', content: { data: [] } }, seen)
    await hiringPostsApi.open({ page: 1, pageSize: 10, occupation: '2513.5' })
    expect(seen[0].params).toEqual({ page: 1, pageSize: 10, occupation: '2513.5' })
  })
})

describe('draftFromPost', () => {
  it('fills the form from a saved post', () => {
    const value = draftFromPost({
      id: 1, recruiterId: 2, title: 'QA Engineer', description: 'Test the product end to end.',
      occupationCode: '2519.1', specialty: null, yearsRequired: 2, skills: ['Selenium'], closesAt: '2026-12-01T16:59:59.000Z',
      status: 'OPEN', applicationCount: 0, viewerHasApplied: false,
    })
    expect(value).toMatchObject({ occupationCode: '2519.1', specialty: '', legacyField: '', yearsRequired: '2', skills: ['Selenium'], closesAt: '2026-12-01', salaryMin: '' })
  })

  it('opens a post saved before occupations with its old field and no occupation', () => {
    const value = draftFromPost({
      id: 2, recruiterId: 2, title: 'Backend Engineer', description: 'Build the APIs.',
      occupationCode: null, legacyField: 'Software development', yearsRequired: 3, skills: [],
      status: 'OPEN', applicationCount: 0, viewerHasApplied: false,
    })
    expect(value).toMatchObject({ occupationCode: '', specialty: '', legacyField: 'Software development' })
  })
})

describe('postOccupation', () => {
  it('names the occupation, or the old field of a post saved before occupations', () => {
    expect(postOccupation({ occupationTitle: 'web developer', legacyField: null })).toEqual({ label: 'Web developer', legacy: false })
    expect(postOccupation({ occupationTitle: null, legacyField: 'QA' })).toEqual({ label: 'QA', legacy: true })
    expect(postOccupation({ occupationTitle: null, legacyField: null })).toBeNull()
  })
})
