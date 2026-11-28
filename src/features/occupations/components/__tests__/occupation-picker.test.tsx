import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient } from '@/shared/api/client'
import { resumeDraftFromData } from '@/features/users/utils/resume'
import {
  defaultMainOccupation,
  isStillChoice,
  jobOccupationChange,
  mainOccupationChange,
  matchedSpecialty,
  ResumeCareerFields,
} from '@/features/users/components/resume/resume-career-fields'
import { parseResumeJobs, type ResumeJob } from '@/features/users/utils/resume-career'
import { occupationKeys, occupationsApi, type Occupation, type OccupationHit } from '../../api'
import { OccupationPicker, OccupationResults } from '../occupation-picker'
import { filterSpecialties, SpecialtyPicker } from '../specialty-picker'

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
      const picker = render(<SpecialtyPicker occupation={occupation.code} value="Front End Developer" onChange={() => undefined} />,
        [occupation])
      expect(picker).toMatch(/role="combobox"[^>]*value="Front End Developer"/)
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
    // Not listed in red up front (2026-11-28): the box turns red only after the user leaves it empty.
    expect(html).not.toContain('Choose your occupation.')
  })
})

describe('the occupation box is not red before the user touches it (2026-11-28)', () => {
  it('shows the empty hint in grey and no invalid flag on a form that was just opened', () => {
    const html = render(<OccupationPicker label="Occupation" required value="" invalid onPick={() => undefined} />)
    expect(html).not.toContain('aria-invalid="true"')
    expect(html).not.toContain('text-danger">Choose your occupation')
  })

  it('shows it in red after a failed save (showInvalid)', () => {
    const html = render(<OccupationPicker label="Occupation" required value="" invalid showInvalid onPick={() => undefined} />)
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('text-danger">Choose your occupation')
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
    // One box: the chosen title is the combobox's own value, with the clear button beside it.
    expect(chosen).toMatch(/role="combobox"[^>]*value="Web developer"/)
    expect(chosen).not.toContain('aria-describedby')
  })

  it('shows the chosen specialty in its one search box, with a clear button', () => {
    const html = render(<SpecialtyPicker occupation="2513.5" value="Back End Developer" onChange={() => undefined} />, [webDeveloper])
    expect(html).toMatch(/role="combobox"[^>]*value="Back End Developer"/)
    expect(html).toContain('aria-label="Clear specialty"')
    expect(html).not.toContain('None chosen')
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
