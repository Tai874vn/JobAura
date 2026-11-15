import { describe, expect, it } from 'vitest'
import { draftFromPost, emptyHiringPostDraft, hiringPostPayload, type HiringPostDraft } from './hiring-post-form'

const now = new Date('2026-11-15T10:00:00')
const draft = (change: Partial<HiringPostDraft> = {}): HiringPostDraft => ({
  ...emptyHiringPostDraft,
  title: 'Backend Engineer',
  careerField: 'Software development',
  yearsRequired: '3',
  description: 'Build and run the APIs behind our hiring platform.',
  skills: ['Node.js', 'PostgreSQL'],
  ...change,
})

describe('hiringPostPayload', () => {
  it('builds the API payload with numbers and optional fields left out', () => {
    const result = hiringPostPayload(draft({ companyName: '  ', salaryMin: '1500' }), now)
    expect(result.error).toBeUndefined()
    expect(result.data).toMatchObject({
      title: 'Backend Engineer', careerField: 'Software development', yearsRequired: 3,
      skills: ['Node.js', 'PostgreSQL'], salaryMin: 1500, employmentType: 'Full-time',
    })
    expect(result.data?.companyName).toBeUndefined()
  })

  it('requires a field from the list and the required years', () => {
    expect(hiringPostPayload(draft({ careerField: '' }), now).error).toBe('Choose the field of work')
    expect(hiringPostPayload(draft({ careerField: 'Wizardry' }), now).error).toBe('Choose the field of work from the list')
    expect(hiringPostPayload(draft({ yearsRequired: '' }), now).error).toMatch(/years/i)
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

describe('draftFromPost', () => {
  it('fills the form from a saved post', () => {
    const value = draftFromPost({
      id: 1, recruiterId: 2, title: 'QA Engineer', description: 'Test the product end to end.',
      careerField: 'QA', yearsRequired: 2, skills: ['Selenium'], closesAt: '2026-12-01T16:59:59.000Z',
      status: 'OPEN', applicationCount: 0, viewerHasApplied: false,
    })
    expect(value).toMatchObject({ careerField: 'QA', yearsRequired: '2', skills: ['Selenium'], closesAt: '2026-12-01', salaryMin: '' })
  })
})
