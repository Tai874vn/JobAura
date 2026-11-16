'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { skillsApi, type FieldOfStudy } from '@/shared/api/endpoints/users'
import type { ResumeOccupationYears } from '@/shared/schemas'
import { Button, Input, Select, Textarea } from '@/shared/ui'
import { occupationLabel, occupationQuery, type OccupationHit } from '@/features/occupations/api'
import { OccupationPicker, useOccupationTitle } from '@/features/occupations/occupation-picker'
import { SpecialtyPicker } from '@/features/occupations/specialty-picker'
import type { ResumeDraft, ResumeFieldKey } from './resume'
import {
  degreeLevels,
  emptyResumeJob,
  formatCredit,
  formatYears,
  parseResumeJobs,
  relatedLines,
  resumeCareerProblems,
  serializeResumeJobs,
  type ResumeJob,
} from './resume-career'

type MainChoice = { Occupation: string; Specialty: string }

/**
 * The main occupation and specialty after picking a search result. A different occupation drops the old specialty
 * (it may not be listed there); the hit's matched specialty is filled in afterwards by `matchedSpecialty`.
 */
export function mainOccupationChange(hit: OccupationHit, current: MainChoice): MainChoice {
  return { Occupation: hit.code, Specialty: hit.code === current.Occupation ? current.Specialty : '' }
}

/** The specialty a search hit matched, when it is one of the occupation's specialties (not an alternative title). */
export function matchedSpecialty(hit: OccupationHit, specialties: string[] | undefined) {
  return hit.matchedLabel && specialties?.includes(hit.matchedLabel) ? hit.matchedLabel : null
}

/** A job's occupation pick changes that job only: never the main occupation or specialty. */
export function jobOccupationChange(jobs: ResumeJob[], index: number, code: string): { Jobs: string } {
  return { Jobs: serializeResumeJobs(jobs.map((job, position) => (position === index ? { ...job, occupation: code } : job))) }
}

/** Occupation, specialty, and dated jobs: the structured inputs the seniority preview reads. */
export function ResumeCareerFields({
  draft,
  onFieldChange,
  years = null,
}: {
  draft: Pick<ResumeDraft, 'Occupation' | 'Specialty' | 'Jobs'> & Partial<Pick<ResumeDraft, 'Degree' | 'FieldOfStudy' | 'LegacyField'>>
  onFieldChange: (field: ResumeFieldKey, value: string) => void
  /** The saved years breakdown while the draft's occupation and job dates are the saved ones; null otherwise. */
  years?: ResumeOccupationYears | null
}) {
  const client = useQueryClient()
  const jobs = parseResumeJobs(draft.Jobs)
  const occupation = draft.Occupation ?? ''
  const specialty = draft.Specialty ?? ''
  const detail = useQuery(occupationQuery(occupation))
  const problems = resumeCareerProblems(draft, detail.data?.specialties)

  function setJobs(next: ResumeJob[]) {
    onFieldChange('Jobs', next.length ? serializeResumeJobs(next) : '')
  }
  function updateJob(index: number, change: Partial<ResumeJob>) {
    setJobs(jobs.map((job, position) => (position === index ? { ...job, ...change } : job)))
  }
  async function pickMain(hit: OccupationHit) {
    const next = mainOccupationChange(hit, { Occupation: occupation, Specialty: specialty })
    onFieldChange('Occupation', next.Occupation)
    if (next.Specialty !== specialty) onFieldChange('Specialty', next.Specialty)
    if (!hit.matchedLabel) return
    try {
      const found = matchedSpecialty(hit, (await client.fetchQuery(occupationQuery(hit.code))).specialties)
      if (found) onFieldChange('Specialty', found)
    } catch {
      // The specialty stays empty; the user can pick it from the list.
    }
  }

  return (
    <div data-focus="career" className="grid gap-3 rounded-lg border border-border p-3 sm:p-4">
      <div>
        <h4 className="font-display text-base font-bold">Occupation and specialty</h4>
        <p className="mt-1 text-xs leading-5 text-muted">
          Required. The AI seniority preview judges your experience and skills in this occupation.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <OccupationPicker label="Occupation" required value={occupation} previously={draft.LegacyField || undefined}
          invalid={!occupation} onPick={(hit) => void pickMain(hit)}
          onClear={() => { onFieldChange('Occupation', ''); onFieldChange('Specialty', '') }} />
        <SpecialtyPicker occupation={occupation} value={specialty} onChange={(value) => onFieldChange('Specialty', value)} />
      </div>
      {occupation ? <OccupationYears occupation={occupation} years={years} /> : null}

      <div data-focus="jobs" className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-base font-bold">Jobs</h4>
            <p className="text-xs leading-5 text-muted">Add each job with its dates and occupation, so time in your occupation can be counted.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => setJobs([...jobs, { ...emptyResumeJob, occupation }])}>
            <Plus className="h-4 w-4" />
            Add job
          </Button>
        </div>
        {jobs.map((job, index) => (
          <fieldset key={index} className="grid gap-2 rounded-lg border border-border bg-surface-muted p-3">
            <legend className="sr-only">Job {index + 1}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Job title</span>
                <Input value={job.title} maxLength={120} onChange={(event) => updateJob(index, { title: event.target.value })} />
              </label>
              <OccupationPicker compact label="Occupation of this job" value={job.occupation} previously={job.legacyField}
                emptyLabel="None chosen: this job's months count toward no occupation"
                placeholder="Search, for example ICT business analyst"
                onPick={(hit) => onFieldChange('Jobs', jobOccupationChange(jobs, index, hit.code).Jobs)}
                onClear={() => updateJob(index, { occupation: '' })} />
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Start month</span>
                <Input type="month" value={job.start} onChange={(event) => updateJob(index, { start: event.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold">End month</span>
                <Input type="month" value={job.current ? '' : job.end} disabled={job.current}
                  onChange={(event) => updateJob(index, { end: event.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={job.current} onChange={(event) => updateJob(index, { current: event.target.checked })} />
              I work here now
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold">What you did <span className="font-normal text-muted">(optional)</span></span>
              <Textarea className="min-h-16" value={job.description} maxLength={2000}
                onChange={(event) => updateJob(index, { description: event.target.value })} />
            </label>
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="ghost" onClick={() => setJobs(jobs.filter((_, position) => position !== index))}>
                <Trash2 className="h-4 w-4" />
                Remove job
              </Button>
            </div>
          </fieldset>
        ))}
      </div>

      <EducationFields degree={draft.Degree ?? ''} fieldOfStudy={draft.FieldOfStudy ?? ''} onFieldChange={onFieldChange} />

      {problems.length ? (
        <ul className="list-disc rounded-lg border border-danger/20 bg-danger/5 py-2 pl-7 pr-3 text-sm text-danger" aria-live="polite">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Years in the main occupation, and on separate lines the small credit from related occupations' jobs (ESCO skill
 * groups shared x 0.3). Jobs in unrelated occupations, or with none, add no line. Counted by the backend from the
 * saved jobs, so a changed occupation or job date shows its years after saving.
 */
export function OccupationYears({ occupation, years }: { occupation: string; years: ResumeOccupationYears | null }) {
  const loadedTitle = useOccupationTitle(occupation)
  const title = years ? occupationLabel(years.occupation.title) : loadedTitle ?? 'this occupation'
  if (!years) {
    return (
      <p data-focus="years" className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted">
        Experience as {title}: <span className="font-semibold text-foreground">counted when you save</span>
        <span className="block text-xs">Counted from the start and end months of your jobs in this occupation.</span>
      </p>
    )
  }
  const lines = relatedLines(years)
  const shownTotal = lines.reduce((sum, other) => sum + Number(formatCredit(other.credit)), 0)
  const capped = years.others.reduce((sum, other) => sum + other.credit, 0) > years.years
  return (
    <div data-focus="years" className="grid gap-1 rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted">
      <p>Experience as {title}: <span className="font-semibold text-foreground">{formatYears(years.years)}</span></p>
      {lines.length ? (
        <ul className="grid gap-0.5" aria-label="Related experience">
          {lines.map((other) => {
            const why = `${Math.round(other.overlap * 100)}% of ESCO skill groups shared × 0.3`
            return (
              <li key={other.code} title={why}>
                Related experience: {occupationLabel(other.title)} {formatYears(other.years)} →{' '}
                <span className="font-semibold text-foreground">+{formatCredit(other.credit)} yr</span>
                <span className="sr-only"> ({why})</span>
              </li>
            )
          })}
        </ul>
      ) : null}
      {lines.length > 1 || capped || Math.abs(shownTotal - years.related) >= 0.05 ? (
        <p>
          Related credit in total: <span className="font-semibold text-foreground">+{formatCredit(years.related)} yr</span>
          {capped ? <span> (at most your years as {title})</span> : null}
        </p>
      ) : null}
      <p className="text-xs">Counted from the start and end months of your jobs. Related experience is a small separate credit, never added to your years in this occupation.</p>
    </div>
  )
}

function groupByBroad(fields: FieldOfStudy[]) {
  const groups = new Map<string, FieldOfStudy[]>()
  for (const field of fields) groups.set(field.broad, [...(groups.get(field.broad) ?? []), field])
  return [...groups.entries()]
}

/** Highest degree and its field of study, both chosen from fixed lists (field of study: ISCED-F 2013). */
function EducationFields({
  degree,
  fieldOfStudy,
  onFieldChange,
}: {
  degree: string
  fieldOfStudy: string
  onFieldChange: (field: ResumeFieldKey, value: string) => void
}) {
  const fields = useQuery({ queryKey: ['fields-of-study'], queryFn: skillsApi.fieldsOfStudy, staleTime: Infinity })
  const options = fields.data?.content ?? []
  const hasDegree = degree !== '' && degree !== 'Not stated'
  return (
    <div data-focus="education" className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Highest degree</span>
        <Select value={degree} onChange={(event) => {
          onFieldChange('Degree', event.target.value)
          if (event.target.value === 'Not stated') onFieldChange('FieldOfStudy', '')
        }}>
          <option value="">Choose</option>
          {degreeLevels.map((level) => <option key={level} value={level}>{level}</option>)}
        </Select>
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Field of study</span>
        <Select value={fieldOfStudy} disabled={!hasDegree} onChange={(event) => onFieldChange('FieldOfStudy', event.target.value)}>
          <option value="">{fields.isError ? 'List unavailable, try again later' : hasDegree ? 'Choose' : 'Choose a degree first'}</option>
          {fieldOfStudy && !options.some((field) => field.code === fieldOfStudy) ? <option value={fieldOfStudy}>{fieldOfStudy}</option> : null}
          {groupByBroad(options).map(([broad, items]) => (
            <optgroup key={broad} label={broad[0].toUpperCase() + broad.slice(1)}>
              {items.map((field) => <option key={field.code} value={field.code}>{field.name}</option>)}
            </optgroup>
          ))}
        </Select>
      </label>
    </div>
  )
}
