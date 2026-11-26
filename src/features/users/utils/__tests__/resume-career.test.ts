import { describe, expect, it } from 'vitest'
import type { ResumeOccupationYears } from '@/shared/schemas'
import { emptyResumeDraft, resumeDraftFromData, resumeDraftToImportPayload } from '../resume'
import {
  emptyResumeJob,
  formatYears,
  isOccupationCode,
  parseResumeJobs,
  relatedLines,
  resumeCareerProblems,
  savedOccupationYears,
  serializeResumeJobs,
  type ResumeJob,
} from '../resume-career'

const job = (change: Partial<ResumeJob>): ResumeJob => ({ ...emptyResumeJob, title: 'Developer', occupation: '2513.5', ...change })

describe('occupation and jobs', () => {
  it('requires an occupation from the catalogue; the specialty is optional', () => {
    expect(resumeCareerProblems({ Occupation: '', Specialty: '' })).toEqual(['Choose your occupation.'])
    expect(resumeCareerProblems({ Occupation: 'Software development' })).toEqual(['Choose your occupation.'])
    expect(resumeCareerProblems({ Occupation: '2513.5', Specialty: '' })).toEqual([])
    expect(isOccupationCode('2166.3.1')).toBe(true)
    expect(isOccupationCode('2513')).toBe(false)
  })

  it('checks the specialty against the occupation once its specialties are known', () => {
    const specialties = ['Full Stack Developer', 'Front End Developer']
    expect(resumeCareerProblems({ Occupation: '2513.5', Specialty: 'Full Stack Developer' }, specialties)).toEqual([])
    expect(resumeCareerProblems({ Occupation: '2513.5', Specialty: 'Pastry' }, specialties))
      .toEqual(['Choose a specialty listed under your occupation.'])
  })

  it('checks each started job but ignores empty rows', () => {
    const jobs = [
      emptyResumeJob,
      job({ title: '', start: '2020-01', end: '2021-01' }),
      job({ start: '2022-05', end: '2021-01' }),
      job({ start: '2023-01', current: true }),
    ]
    expect(resumeCareerProblems({ Occupation: '2513.5', Jobs: serializeResumeJobs(jobs) })).toEqual([
      'Job 2: add the job title.',
      'Job 3: the end month is before the start month.',
    ])
  })

  it('keeps a job whose title matches no occupation, with its months and no occupation (Review Focus 2)', () => {
    const ninja = job({ title: 'Ninja coder', occupation: '', start: '2019-01', end: '2021-06' })
    const draft = { Occupation: '2513.5', Jobs: serializeResumeJobs([ninja]) }
    expect(resumeCareerProblems(draft)).toEqual([])
    expect(resumeDraftToImportPayload({ ...emptyResumeDraft, ...draft }).data.Jobs).toEqual([
      { title: 'Ninja coder', occupation: '', start: '2019-01', end: '2021-06', current: false, description: '' },
    ])
  })

  it('round-trips jobs through the string draft and saves them as an array without empty rows', () => {
    const saved = [job({ start: '2020-01', end: '2021-06', description: ' Built APIs ' })]
    const draft = resumeDraftFromData({ Occupation: '2513.5', Specialty: 'Back End Developer', Jobs: saved })
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

describe('a resume saved before occupations (Review Focus 1)', () => {
  const legacy = {
    LegacyField: 'Software development',
    Specialty: 'Fullstack',
    Jobs: [{ title: 'Dev', occupation: '', legacyField: 'Software development', start: '2020-01', end: '', current: true, description: '' }],
  }

  it('opens with its data, shows the old field read-only, and asks for an occupation', () => {
    const draft = resumeDraftFromData(legacy)
    expect(draft.LegacyField).toBe('Software development')
    expect(draft.Occupation).toBe('')
    expect(draft.Specialty).toBe('Fullstack')
    expect(parseResumeJobs(draft.Jobs)[0]).toMatchObject({ title: 'Dev', legacyField: 'Software development' })
    expect(resumeCareerProblems(draft)).toEqual(['Choose your occupation.'])
  })

  it('reads an unmigrated Industry and job field as the old values', () => {
    // Data in the old shape, as an unmigrated resume would arrive.
    const unmigrated = { Industry: 'QA', Jobs: [{ title: 'Tester', field: 'QA', start: '2021-01', end: '2022-01', current: false, description: '' }] }
    const draft = resumeDraftFromData(unmigrated as Parameters<typeof resumeDraftFromData>[0])
    expect(draft.LegacyField).toBe('QA')
    expect(parseResumeJobs(draft.Jobs)[0].legacyField).toBe('QA')
  })

  it('never sends the old values: the backend keeps them read-only', () => {
    const payload = resumeDraftToImportPayload({ ...resumeDraftFromData(legacy), Occupation: '2513.5' }).data
    expect(payload).not.toHaveProperty('LegacyField')
    expect(payload).not.toHaveProperty('Industry')
    expect(payload.Jobs?.[0]).not.toHaveProperty('legacyField')
    expect(payload.Occupation).toBe('2513.5')
  })
})

describe('years counted by the backend', () => {
  // The backend's breakdown for these jobs (real overlaps: accountant to software developer is 0.0455).
  const breakdown: ResumeOccupationYears = {
    occupation: { code: '2512.3', title: 'software developer' },
    years: 2,
    related: 0.3,
    otherCredit: 0.1,
    capped: false,
    others: [
      { code: '2511.8', title: 'ICT business analyst', years: 2, overlap: 0.3404, closelyRelated: true, credit: 0.2042, shownCredit: 0.2 },
      { code: '2411.1', title: 'accountant', years: 10, overlap: 0.0455, closelyRelated: false, credit: 0.1364, shownCredit: 0 },
    ],
  }
  const jobs = [
    job({ occupation: '2511.8', start: '2022-11', end: '2024-11' }),
    job({ occupation: '2512.3', start: '2024-11', current: true }),
  ]
  const resume = { data: { Occupation: '2512.3', Jobs: jobs }, occupationYears: breakdown }

  it('shows the saved years while the occupation and job dates are the saved ones', () => {
    const draft = resumeDraftFromData(resume.data)
    expect(savedOccupationYears(resume, draft)).toBe(breakdown)
    // Editing a description does not change the years.
    const described = serializeResumeJobs(parseResumeJobs(draft.Jobs).map((item) => ({ ...item, description: 'More' })))
    expect(savedOccupationYears(resume, { ...draft, Jobs: described })).toBe(breakdown)
  })

  it('drops them once the occupation or a job date changes, until saved', () => {
    const draft = resumeDraftFromData(resume.data)
    expect(savedOccupationYears(resume, { ...draft, Occupation: '2513.5' })).toBeNull()
    const moved = serializeResumeJobs(parseResumeJobs(draft.Jobs).map((item, index) => (index ? item : { ...item, start: '2021-11' })))
    expect(savedOccupationYears(resume, { ...draft, Jobs: moved })).toBeNull()
    expect(savedOccupationYears(null, draft)).toBeNull()
  })

  it('gives closely related occupations their own line, and none for jobs that share few skills', () => {
    expect(relatedLines(breakdown).map((other) => other.title)).toEqual(['ICT business analyst'])
    expect(formatYears(3)).toBe('3 yr')
    expect(formatYears(1.5)).toBe('1.5 yr')
  })
})
