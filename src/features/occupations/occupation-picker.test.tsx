import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/shared/api/client'
import type { ResumeOccupationYears } from '@/shared/schemas'
import { resumeDraftFromData } from '@/features/users/resume'
import {
  defaultMainOccupation,
  isStillChoice,
  jobOccupationChange,
  mainOccupationChange,
  matchedSpecialty,
  OccupationYears,
  ResumeCareerFields,
} from '@/features/users/resume-career-fields'
import { parseResumeJobs, type ResumeJob } from '@/features/users/resume-career'
import { occupationKeys, occupationsApi, type Occupation, type OccupationHit } from './api'
import { OccupationPicker, OccupationResults } from './occupation-picker'
import { filterSpecialties, SpecialtyPicker } from './specialty-picker'

// Real catalogue rows (NestjsBE src/common/data/occupations.json), cut to a few of their specialties.
const webDeveloper: Occupation = {
  code: '2513.5', isco: '2513', title: 'web developer', related: [],
  specialties: ['Back End Developer', 'Front End Developer', 'Full Stack Developer', 'Full Stack Web Developer'],
}
const uiDeveloper: Occupation = {
  code: '2512.4', isco: '2512', title: 'user interface developer', related: [],
  specialties: ['Front End Developer', 'UI Developer (User Interface Developer)'],
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

describe('the main occupation defaults to the current job (Decision 4)', () => {
  const jobsOf = (jobs: Array<Partial<ResumeJob>>) => resumeDraftFromData({
    Jobs: jobs.map((job) => ({ title: 'Job', occupation: '', start: '2018-01', end: '', current: false, description: '', ...job })),
  }).Jobs

  it("fills an empty main occupation with the current job's", () => {
    const Jobs = jobsOf([
      { occupation: '2511.8', end: '2021-06' },
      { occupation: '2513.5', start: '2021-07', current: true },
    ])
    expect(defaultMainOccupation({ Occupation: '', Jobs }, undefined)).toBe('2513.5')
  })

  it('takes the job with the latest end month when none is current', () => {
    const Jobs = jobsOf([
      { occupation: '2513.5', end: '2024-03' },
      { occupation: '2511.8', end: '2020-01' },
    ])
    expect(defaultMainOccupation({ Occupation: '', Jobs }, undefined)).toBe('2513.5')
  })

  it('never replaces an occupation the user chose', () => {
    const Jobs = jobsOf([{ occupation: '2513.5', current: true }])
    expect(defaultMainOccupation({ Occupation: '2511.8', Jobs }, undefined)).toBe('')
  })

  it('lets the user clear it: no refill until the jobs change', () => {
    const Jobs = jobsOf([{ occupation: '2513.5', current: true }])
    expect(defaultMainOccupation({ Occupation: '', Jobs }, Jobs)).toBe('')
    const edited = jobsOf([{ occupation: '2512.3', current: true }])
    expect(defaultMainOccupation({ Occupation: '', Jobs: edited }, Jobs)).toBe('2512.3')
  })

  it('gives no default when the current job has no occupation, or tied current jobs disagree', () => {
    expect(defaultMainOccupation({ Occupation: '', Jobs: jobsOf([{ occupation: '', current: true }, { occupation: '2513.5', end: '2024-01' }]) }, undefined)).toBe('')
    expect(defaultMainOccupation({ Occupation: '', Jobs: jobsOf([
      { occupation: '2513.5', start: '2022-01', current: true },
      { occupation: '2511.8', start: '2022-01', current: true },
    ]) }, undefined)).toBe('')
    expect(defaultMainOccupation({ Occupation: '', Jobs: jobsOf([
      { occupation: '2513.5', start: '2020-01', current: true },
      { occupation: '2511.8', start: '2022-01', current: true },
    ]) }, undefined)).toBe('2511.8')
    expect(defaultMainOccupation({ Occupation: '', Jobs: '' }, undefined)).toBe('')
  })
})

describe('years shown separately', () => {
  // The backend's breakdown for web developer since 2023-11, ICT business analyst 2022-11 to 2024-11, and accountant
  // 2010-11 to 2020-11, counted on 2026-11-16 with the real overlaps (accountant to web developer is 0.0811).
  const breakdown: ResumeOccupationYears = {
    occupation: { code: '2513.5', title: 'web developer' },
    years: 3,
    related: 0.4,
    otherCredit: 0.2,
    capped: false,
    others: [
      { code: '2411.1', title: 'accountant', years: 10, overlap: 0.0811, closelyRelated: false, credit: 0.2432, shownCredit: 0 },
      { code: '2511.8', title: 'ICT business analyst', years: 2, overlap: 0.2813, closelyRelated: true, credit: 0.1687, shownCredit: 0.2 },
    ],
  }

  it('shows the main years, a line per closely related occupation, and one line for the rest', () => {
    const html = render(<OccupationYears occupation="2513.5" years={breakdown} />)
    expect(text(html)).toContain('Experience as Web developer: 3 yr')
    expect(text(html)).toContain('Related experience: ICT business analyst 2 yr → +0.2 yr')
    expect(html).toContain('title="28% of ESCO skill groups shared × 0.3"')
    // Ten years as an accountant share few skills with web development: no line of their own.
    expect(text(html)).not.toContain('Accountant')
    expect(text(html)).toContain('Other experience: +0.2 yr')
    expect(html).toContain('title="These jobs share few skills with Web developer, so they count a little (overlap × 0.3)."')
    expect(text(html)).not.toContain('capped')
  })

  it('adds up to the related years the AI reads', () => {
    const shown = breakdown.others.filter((other) => other.closelyRelated).reduce((sum, other) => sum + other.shownCredit, 0)
    expect(Math.round((shown + breakdown.otherCredit) * 10)).toBe(Math.round(breakdown.related * 10))
  })

  it('opens each explanation from a focusable button, for keyboard and touch', () => {
    const html = render(<OccupationYears occupation="2513.5" years={breakdown} />)
    expect(html).toMatch(/<button type="button" aria-label="How \+0\.2 yr is counted" title="28% of ESCO skill groups shared × 0\.3" aria-expanded="false"/)
  })

  it('hides the other line when its credit rounds to nothing', () => {
    const html = text(render(<OccupationYears occupation="2513.5" years={{ ...breakdown, related: 0.2, otherCredit: 0 }} />))
    expect(html).toContain('Related experience: ICT business analyst 2 yr → +0.2 yr')
    expect(html).not.toContain('Other experience')
  })

  it('says when the credit is capped at the main years', () => {
    const capped: ResumeOccupationYears = {
      occupation: { code: '2511.3', title: 'data scientist' },
      years: 1,
      related: 1,
      otherCredit: 0.2,
      capped: true,
      others: [
        { code: '2511.2', title: 'data analyst', years: 6, overlap: 0.8421, closelyRelated: true, credit: 1.5158, shownCredit: 0.8 },
        { code: '2411.1', title: 'accountant', years: 10, overlap: 0.1081, closelyRelated: false, credit: 0.3243, shownCredit: 0 },
      ],
    }
    const html = text(render(<OccupationYears occupation="2511.3" years={capped} />))
    expect(html).toContain('Experience as Data scientist: 1 yr')
    expect(html).toContain('Related experience: Data analyst 6 yr → +0.8 yr')
    expect(html).toContain('Other experience: +0.2 yr')
    expect(html).toContain('The credit is capped at your years as Data scientist.')
  })

  it('waits for a save after the occupation or job dates change', () => {
    const html = text(render(<OccupationYears occupation="2513.5" years={null} />, [webDeveloper]))
    expect(html).toContain('Experience as Web developer: counted when you save')
  })
})

describe('picker details', () => {
  it('ignores a slow specialty lookup once the main choice has changed', () => {
    const picked = { Occupation: '2513.5', Specialty: '' }
    expect(isStillChoice({ ...picked }, picked)).toBe(true)
    expect(isStillChoice({ Occupation: '2512.4', Specialty: '' }, picked)).toBe(false)
    expect(isStillChoice({ Occupation: '2513.5', Specialty: 'Back End Developer' }, picked)).toBe(false)
  })

  it('describes the combobox by its hint and points at no list while none is shown', () => {
    const empty = render(<OccupationPicker label="Occupation" value="" previously="QA" onPick={() => undefined} />)
    const hint = empty.match(/<p id="([^"]+)"[^>]*>Choose your occupation/)![1]
    expect(empty).toContain(`aria-describedby="${hint}"`)
    expect(empty).not.toContain('aria-controls')
    const chosen = render(<OccupationPicker label="Occupation" value="2513.5" onPick={() => undefined} />, [webDeveloper])
    expect(text(chosen)).toContain('Chosen: Web developer')
    const chip = chosen.match(/<span id="([^"]+)"[^>]*><span class="sr-only">Chosen: /)![1]
    expect(chosen).toContain(`aria-describedby="${chip}"`)
  })

  it('links an unlisted specialty error to its combobox', () => {
    const html = render(<SpecialtyPicker occupation="2512.4" value="Full Stack Developer" onChange={() => undefined} />, [uiDeveloper])
    const error = html.match(/<p id="([^"]+)"[^>]*>Not listed under this occupation/)![1]
    expect(html).toMatch(new RegExp(`aria-describedby="[^"]*${error}"`))
    expect(html).toContain('aria-invalid="true"')
  })

  it('keeps status rows out of the options and announces the count', () => {
    const html = render(<OccupationResults listId="r" active={0} onChoose={() => undefined}
      hits={[{ code: '2513.5', isco: '2513', title: 'web developer', matchedLabel: 'Full Stack Developer' }]} />)
    // The live region mounts empty, so the count that fills it next is announced.
    expect(html).toMatch(/<li role="presentation"[^>]*><span role="status" aria-live="polite" class="sr-only"><\/span><\/li>/)
    expect(html.match(/role="option"/g)).toHaveLength(1)
    const none = render(<OccupationResults listId="r" active={0} onChoose={() => undefined} hits={[]} />)
    expect(none).toMatch(/role="presentation"[^>]*><span aria-hidden="true">No matching occupation/)
  })
})
