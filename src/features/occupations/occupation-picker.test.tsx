import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/shared/api/client'
import type { ResumeOccupationYears } from '@/shared/schemas'
import { resumeDraftFromData } from '@/features/users/resume'
import {
  jobOccupationChange,
  mainOccupationChange,
  matchedSpecialty,
  OccupationYears,
  ResumeCareerFields,
} from '@/features/users/resume-career-fields'
import { parseResumeJobs, type ResumeJob } from '@/features/users/resume-career'
import { occupationKeys, occupationsApi, type Occupation, type OccupationHit } from './api'
import { OccupationResults } from './occupation-picker'
import { filterSpecialties, SpecialtyPicker } from './specialty-picker'

// Catalogue rows as the backend serves them (src/common/data/occupations.json, synced from the AI service).
const webDeveloper: Occupation = {
  code: '2513.5', isco: '2513', title: 'web developer', related: [],
  specialties: ['Back End Developer', 'Front End Developer', 'Full Stack Developer', 'Full Stack Web Developer'],
}
const uiDeveloper: Occupation = {
  code: '2512.4', isco: '2512', title: 'user interface developer', related: [],
  specialties: ['Front End Developer', 'UI Developer'],
}

function render(element: ReactElement, occupations: Occupation[] = []) {
  const client = new QueryClient()
  for (const occupation of occupations) client.setQueryData(occupationKeys.one(occupation.code), occupation)
  return renderToStaticMarkup(<QueryClientProvider client={client}>{element}</QueryClientProvider>)
}

/** The page text without markup, as a reader sees it. */
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')

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

describe('search by alternative labels and specialties (Review Focus 4)', () => {
  it('asks the backend catalogue, which matches titles, alternative labels and specialties', async () => {
    const seen: InternalAxiosRequestConfig[] = []
    const hits: OccupationHit[] = [{ code: '2512.4', isco: '2512', title: 'user interface developer', matchedLabel: 'front end developer' }]
    apiClient.defaults.adapter = answer(hits, seen)
    await expect(occupationsApi.search('front end developer')).resolves.toEqual(hits)
    expect(seen[0].url).toBe('/api/occupations')
    expect(seen[0].params).toEqual({ q: 'front end developer', limit: 10 })
  })

  it('shows the occupation title with a small "matched" line for the label that matched', () => {
    const html = text(render(<OccupationResults listId="r" active={0} onChoose={() => undefined} hits={[
      { code: '2512.4', isco: '2512', title: 'user interface developer', matchedLabel: 'front end developer' },
      { code: '2513.5', isco: '2513', title: 'web developer', matchedLabel: 'Full Stack Developer' },
      { code: '2511.8', isco: '2511', title: 'ICT business analyst' },
    ]} />))
    expect(html).toContain('User interface developermatched: front end developer')
    expect(html).toContain('Web developermatched: Full Stack Developer')
    // A title hit has no "matched" line.
    expect(html).toContain('ICT business analyst')
    expect(html.match(/matched:/g)).toHaveLength(2)
  })

  it('finds the specialty under web developer when typing "fullstack"', () => {
    expect(filterSpecialties(webDeveloper.specialties, 'fullstack')).toEqual(['Full Stack Developer', 'Full Stack Web Developer'])
    expect(filterSpecialties(webDeveloper.specialties, 'full stack web')).toEqual(['Full Stack Web Developer'])
  })

  it('fills the occupation and the specialty when a result matched a specialty', () => {
    const hit: OccupationHit = { code: '2513.5', isco: '2513', title: 'web developer', matchedLabel: 'Full Stack Developer' }
    expect(mainOccupationChange(hit, { Occupation: '', Specialty: '' })).toEqual({ Occupation: '2513.5', Specialty: '' })
    expect(matchedSpecialty(hit, webDeveloper.specialties)).toBe('Full Stack Developer')
    // An alternative label is not a specialty, so it fills nothing.
    expect(matchedSpecialty({ ...hit, matchedLabel: 'web designer' }, webDeveloper.specialties)).toBeNull()
  })
})

describe('a specialty listed under several occupations (Review Focus 3)', () => {
  const frontEnd = (occupation: Occupation): OccupationHit =>
    ({ code: occupation.code, isco: occupation.isco, title: occupation.title, matchedLabel: 'Front End Developer' })

  it('shows under each of its occupations, in search and in each specialty list', () => {
    const html = text(render(<OccupationResults listId="r" active={0} onChoose={() => undefined}
      hits={[frontEnd(uiDeveloper), frontEnd(webDeveloper)]} />))
    expect(html).toContain('User interface developermatched: Front End Developer')
    expect(html).toContain('Web developermatched: Front End Developer')
    for (const occupation of [uiDeveloper, webDeveloper]) {
      expect(filterSpecialties(occupation.specialties, 'front end')).toEqual(['Front End Developer'])
      const picker = text(render(<SpecialtyPicker occupation={occupation.code} value="Front End Developer" onChange={() => undefined} />,
        [occupation]))
      expect(picker).toContain('Front End Developer')
      expect(picker).not.toContain('Not listed under this occupation')
    }
  })

  it('keeps the main occupation the user picked, with that specialty', () => {
    const picked = mainOccupationChange(frontEnd(webDeveloper), { Occupation: '', Specialty: '' })
    expect(picked.Occupation).toBe('2513.5')
    expect(matchedSpecialty(frontEnd(webDeveloper), webDeveloper.specialties)).toBe('Front End Developer')
    // Picking the same occupation again keeps the chosen specialty; another occupation drops it.
    expect(mainOccupationChange(frontEnd(webDeveloper), { Occupation: '2513.5', Specialty: 'Back End Developer' }))
      .toEqual({ Occupation: '2513.5', Specialty: 'Back End Developer' })
    expect(mainOccupationChange(frontEnd(uiDeveloper), { Occupation: '2513.5', Specialty: 'Back End Developer' }))
      .toEqual({ Occupation: '2512.4', Specialty: '' })
  })

  it("never changes the main occupation from a job's picker", () => {
    const jobs: ResumeJob[] = [{ title: 'Dev', occupation: '', start: '2020-01', end: '', current: true, description: '' }]
    const change = jobOccupationChange(jobs, 0, frontEnd(uiDeveloper).code)
    expect(Object.keys(change)).toEqual(['Jobs'])
    expect(parseResumeJobs(change.Jobs)[0].occupation).toBe('2512.4')
  })

  it('flags a specialty that is not listed under the chosen occupation', () => {
    const picker = text(render(<SpecialtyPicker occupation="2512.4" value="Full Stack Developer" onChange={() => undefined} />, [uiDeveloper]))
    expect(picker).toContain('Not listed under this occupation')
  })
})

describe('the resume career form', () => {
  const draftOf = (data: Record<string, unknown>) => resumeDraftFromData(data)

  it('keeps a job whose title matches no occupation, with no occupation (Review Focus 2)', () => {
    const html = text(render(<ResumeCareerFields onFieldChange={() => undefined} draft={draftOf({
      Occupation: '2513.5',
      Jobs: [{ title: 'Ninja coder', occupation: '', start: '2019-01', end: '2021-06', current: false, description: '' }],
    })} />, [webDeveloper]))
    expect(html).toContain("None chosen: this job's months count toward no occupation")
    expect(html).not.toContain('Job 1:')
  })

  it('opens a resume saved before occupations and asks for an occupation (Review Focus 1)', () => {
    const html = text(render(<ResumeCareerFields onFieldChange={() => undefined} draft={draftOf({
      LegacyField: 'Software development',
      Jobs: [{ title: 'Dev', occupation: '', legacyField: 'Software development', start: '2020-01', end: '', current: true, description: '' }],
    })} />))
    expect(html).toContain('Choose your occupation (previously: Software development)')
    expect(html).toContain("count toward no occupation (previously: Software development)")
    expect(html).toContain('Choose your occupation.')
  })
})

describe('years shown separately', () => {
  const breakdown: ResumeOccupationYears = {
    occupation: { code: '2513.5', title: 'web developer' },
    years: 3,
    related: 0.2,
    others: [
      { code: '2511.8', title: 'ICT business analyst', years: 2, overlap: 0.34, credit: 0.204 },
      // Ten years as an accountant add 0.02: no line for an unrelated job.
      { code: '2411.1', title: 'accountant', years: 10, overlap: 0.0081, credit: 0.0243 },
    ],
  }

  it('shows the main years, then each related occupation on its own line with how its credit was counted', () => {
    const html = render(<OccupationYears occupation="2513.5" years={breakdown} />)
    expect(text(html)).toContain('Experience as Web developer: 3 yr')
    expect(text(html)).toContain('Related experience: ICT business analyst 2 yr → +0.2 yr')
    expect(html).toContain('title="34% of ESCO skill groups shared × 0.3"')
    expect(text(html)).not.toContain('Accountant')
    // One related line that matches the total: no separate total line.
    expect(text(html)).not.toContain('Related credit in total')
  })

  it('shows the capped total when the credit reaches the main years', () => {
    const capped: ResumeOccupationYears = {
      occupation: { code: '2511.3', title: 'data scientist' },
      years: 1,
      related: 1,
      others: [{ code: '2511.2', title: 'data analyst', years: 6, overlap: 0.84, credit: 1.512 }],
    }
    const html = text(render(<OccupationYears occupation="2511.3" years={capped} />))
    expect(html).toContain('Experience as Data scientist: 1 yr')
    expect(html).toContain('Related experience: Data analyst 6 yr → +1.5 yr')
    expect(html).toContain('Related credit in total: +1.0 yr (at most your years as Data scientist)')
  })

  it('waits for a save after the occupation or job dates change', () => {
    const html = text(render(<OccupationYears occupation="2513.5" years={null} />, [webDeveloper]))
    expect(html).toContain('Experience as Web developer: counted when you save')
  })
})
