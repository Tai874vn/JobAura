import { describe, expect, it } from 'vitest'
import { emptyResumeDraft, resumeDraftFromData, resumeDraftToImportPayload } from './resume'
import {
  experienceLabel,
  experienceMonths,
  emptyResumeJob,
  monthsInField,
  parseResumeJobs,
  resumeCareerProblems,
  serializeResumeJobs,
  type ResumeJob,
} from './resume-career'

const job = (change: Partial<ResumeJob>): ResumeJob => ({ ...emptyResumeJob, title: 'Developer', field: 'Software development', ...change })

describe('career fields', () => {
  it('requires a listed field and a specialty', () => {
    expect(resumeCareerProblems({ Industry: '', Specialty: '' })).toEqual([
      'Choose your field.',
      'Add your specialty, for example Fullstack.',
    ])
    expect(resumeCareerProblems({ Industry: 'Software', Specialty: 'Fullstack' })).toEqual(['Choose your field.'])
    expect(resumeCareerProblems({ Industry: 'Software development', Specialty: 'Fullstack' })).toEqual([])
  })

  it('checks each started job but ignores empty rows', () => {
    const jobs = [
      emptyResumeJob,
      job({ title: '', start: '2020-01', end: '2021-01' }),
      job({ start: '2022-05', end: '2021-01' }),
      job({ start: '2023-01', current: true }),
    ]
    expect(resumeCareerProblems({ Industry: 'QA', Specialty: 'Manual', Jobs: serializeResumeJobs(jobs) })).toEqual([
      'Job 2: add the job title.',
      'Job 3: the end month is before the start month.',
    ])
  })

  it('counts months in one field once when jobs overlap, with current jobs running to today', () => {
    const jobs = [
      job({ start: '2018-01', end: '2020-01' }),
      job({ start: '2019-01', end: '2021-01' }),
      job({ field: 'Sales and business development', start: '2015-01', end: '2018-01' }),
      job({ start: '2023-01', current: true }),
    ]
    expect(monthsInField(jobs, 'Software development', new Date(2024, 0, 15))).toBe(36 + 12)
    expect(monthsInField(jobs, 'Sales and business development', new Date(2024, 0, 15))).toBe(36)
  })

  it('round-trips jobs through the string draft and saves them as an array without empty rows', () => {
    const saved = [job({ start: '2020-01', end: '2021-06', description: ' Built APIs ' })]
    const draft = resumeDraftFromData({ Industry: 'Software development', Specialty: 'Backend', Jobs: saved })
    expect(parseResumeJobs(draft.Jobs)).toEqual(saved)
    const withBlankRow = { ...draft, Jobs: serializeResumeJobs([...parseResumeJobs(draft.Jobs), emptyResumeJob]) }
    expect(resumeDraftToImportPayload(withBlankRow).data.Jobs).toEqual([{ ...saved[0], description: 'Built APIs' }])
    expect(resumeDraftToImportPayload({ ...emptyResumeDraft, Name: 'A' }).data).toEqual({ Name: 'A' })
  })

  it('reads unknown or broken job data as no jobs', () => {
    expect(parseResumeJobs('not json')).toEqual([])
    expect(parseResumeJobs({ title: 'x' })).toEqual([])
    expect(parseResumeJobs([null, { title: 'Cook', current: 'yes' }])).toEqual([{ ...emptyResumeJob, title: 'Cook' }])
  })
})

describe('experience from jobs', () => {
  const today = new Date('2026-11-16T00:00:00Z')
  it('counts the months of jobs in the chosen field only', () => {
    const Jobs = JSON.stringify([
      { title: 'Dev', field: 'Software development', start: '2020-01', end: '2022-01', current: false, description: '' },
      { title: 'Lead', field: 'Software development', start: '2021-06', end: '', current: true, description: '' },
      { title: 'Accountant', field: 'Finance', start: '2015-01', end: '2019-12', current: false, description: '' },
    ])
    expect(experienceMonths({ Industry: 'Software development', Jobs }, today)).toBe(82)
    expect(experienceLabel({ Industry: 'Software development', Jobs }, today)).toBe('6 yr 10 mo')
  })

  it('says when there is no experience yet, and nothing without a field', () => {
    expect(experienceLabel({ Industry: 'QA', Jobs: [] }, today)).toBe('No experience yet')
    expect(experienceLabel({ Industry: '' }, today)).toBeNull()
  })
})
