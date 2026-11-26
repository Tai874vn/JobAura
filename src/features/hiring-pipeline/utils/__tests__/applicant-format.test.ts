import { describe, expect, it } from 'vitest'
import { formatApplicantDay, formatYears, resumeJobLines } from '../applicant-format'

describe('applicant format', () => {
  it('writes a day as "12 Nov" and nothing for a bad date', () => {
    expect(formatApplicantDay('2026-11-12T10:00:00')).toBe('12 Nov')
    expect(formatApplicantDay('nope')).toBe('')
    expect(formatApplicantDay(null)).toBe('')
  })

  it('writes years', () => {
    expect(formatYears(1)).toBe('1 year')
    expect(formatYears(6)).toBe('6 years')
    expect(formatYears(null)).toBe('Not given')
  })

  it('turns loose job objects into a title and a period', () => {
    expect(
      resumeJobLines([
        { title: 'QA Lead', start: '2022-03', end: '2024-01', current: false },
        { title: 'Tester', start: '2024-02', end: '', current: true },
        'junk',
      ]),
    ).toEqual([
      { title: 'QA Lead', period: 'Mar 2022 - Jan 2024' },
      { title: 'Tester', period: 'Feb 2024 - Present' },
      { title: 'Job', period: '' },
    ])
  })
})
