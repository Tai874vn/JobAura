'use client'

/**
 * Career, work history, and education fields for the resume editor and hiring forms. Lets users pick an occupation and specialty, add dated jobs, and choose their highest degree.
 *
 * Calls: GET /api/occupations/:code; OccupationPicker; SpecialtyPicker; occupationQuery; parseResumeJobs; resumeCareerProblems
 * Used by:
 *   - features/hiring/components/form/hiring-post-form-dialog.tsx
 *   - features/workspace/components/settings/resume-settings-section.tsx
 */

import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/shared/ui'
import { occupationQuery, type OccupationHit } from '@/features/occupations/api'
import { OccupationPicker } from '@/features/occupations/components/occupation-picker'
import { SpecialtyPicker } from '@/features/occupations/components/specialty-picker'
import type { ResumeDraft, ResumeFieldKey } from '../../utils/resume'
import {
  currentJobOccupation,
  degreeLevels,
  emptyResumeJob,
  parseResumeJobs,
  resumeCareerProblems,
  serializeResumeJobs,
  type ResumeJob,
} from '../../utils/resume-career'

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

/** True while the main choice is still the one a pick made: a slow specialty lookup must not overwrite a newer one. */
export function isStillChoice(current: MainChoice, picked: MainChoice) {
  return current.Occupation === picked.Occupation && current.Specialty === picked.Specialty
}

/** A job's occupation pick changes that job only: never the main occupation or specialty. */
export function jobOccupationChange(jobs: ResumeJob[], index: number, code: string): { Jobs: string } {
  return { Jobs: serializeResumeJobs(jobs.map((job, position) => (position === index ? { ...job, occupation: code } : job))) }
}

/**
 * The main occupation to fill in when none is chosen: the current job's (Decision 4). It is applied only when the
 * jobs have changed since `seenJobs` (a load, a job edit, a CV extraction), and never over a chosen occupation, so
 * clearing the main occupation does not fill it straight back and the user can still pick another. Empty: no change.
 */
export function defaultMainOccupation(draft: { Occupation?: string; Jobs?: string }, seenJobs: string | undefined) {
  if (draft.Occupation || draft.Jobs === seenJobs) return ''
  return currentJobOccupation(parseResumeJobs(draft.Jobs))
}

/** Occupation, specialty, and dated jobs: the structured inputs the seniority preview reads. */
export function ResumeCareerFields({
  draft,
  onFieldChange,
}: {
  draft: Pick<ResumeDraft, 'Occupation' | 'Specialty' | 'Jobs'> & Partial<Pick<ResumeDraft, 'Degree' | 'FieldOfStudy' | 'LegacyField'>>
  onFieldChange: (field: ResumeFieldKey, value: string) => void
}) {
  const client = useQueryClient()
  const jobs = parseResumeJobs(draft.Jobs)
  const occupation = draft.Occupation ?? ''
  const specialty = draft.Specialty ?? ''
  // Data: occupationQuery() → occupationsApi.get → GET /api/occupations/:code → NestjsBE/src/modules/occupations/services/occupations.service.ts occupation()
  const detail = useQuery(occupationQuery(occupation))
  // "Choose your occupation" is not listed up front: the box turns red once the user leaves it empty, and the
  // save bar says it is needed. The other problems (specialty, job dates) only appear after the user typed something.
  const problems = resumeCareerProblems(draft, detail.data?.specialties).filter((problem) => problem !== 'Choose your occupation.')

  function setJobs(next: ResumeJob[]) {
    onFieldChange('Jobs', next.length ? serializeResumeJobs(next) : '')
  }
  function updateJob(index: number, change: Partial<ResumeJob>) {
    setJobs(jobs.map((job, position) => (position === index ? { ...job, ...change } : job)))
  }
  // Decision 4: while no main occupation is chosen, it defaults to the current job's. Applied when the jobs change
  // (load, edit, CV extraction), not when the user clears the main occupation, so the user can still change it.
  const seenJobs = useRef<string | undefined>(undefined)
  useEffect(() => {
    const fallback = defaultMainOccupation({ Occupation: occupation, Jobs: draft.Jobs }, seenJobs.current)
    seenJobs.current = draft.Jobs
    if (fallback) onFieldChange('Occupation', fallback)
  }, [draft.Jobs, occupation, onFieldChange])

  // The latest main choice, read after the specialty list loads: a later pick or edit wins over a slow response.
  const latest = useRef<MainChoice>({ Occupation: occupation, Specialty: specialty })
  useEffect(() => { latest.current = { Occupation: occupation, Specialty: specialty } })

  async function pickMain(hit: OccupationHit) {
    const next = mainOccupationChange(hit, { Occupation: occupation, Specialty: specialty })
    latest.current = next
    onFieldChange('Occupation', next.Occupation)
    if (next.Specialty !== specialty) onFieldChange('Specialty', next.Specialty)
    if (!hit.matchedLabel) return
    try {
      const found = matchedSpecialty(hit, (await client.fetchQuery(occupationQuery(hit.code))).specialties)
      if (found && isStillChoice(latest.current, next)) onFieldChange('Specialty', found)
    } catch {
      // The specialty stays empty; the user can pick it from the list.
    }
  }

  return (
    <div data-focus="career" className="grid gap-3 rounded-lg border border-border p-3 sm:p-4">
      <div>
        <h3 className="font-display text-base font-medium">Occupation and specialty</h3>
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

      <div data-focus="jobs" className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-medium">Jobs</h3>
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
                <span className="text-xs font-medium">Job title</span>
                <Input value={job.title} maxLength={120} onChange={(event) => updateJob(index, { title: event.target.value })} />
              </label>
              <OccupationPicker compact label="Occupation of this job" value={job.occupation} previously={job.legacyField}
                emptyLabel="None chosen: this job's months count toward no occupation"
                placeholder="Search, for example ICT business analyst"
                onPick={(hit) => onFieldChange('Jobs', jobOccupationChange(jobs, index, hit.code).Jobs)}
                onClear={() => updateJob(index, { occupation: '' })} />
              <label className="grid gap-1">
                <span className="text-xs font-medium">Start month</span>
                <Input type="month" value={job.start} onChange={(event) => updateJob(index, { start: event.target.value })} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium">End month</span>
                <Input type="month" value={job.current ? '' : job.end} disabled={job.current}
                  onChange={(event) => updateJob(index, { end: event.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={job.current} onChange={(event) => updateJob(index, { current: event.target.checked })} />
              I work here now
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium">What you did <span className="font-normal text-muted">(optional)</span></span>
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

      <EducationFields degree={draft.Degree ?? ''} onFieldChange={onFieldChange} />

      {problems.length ? (
        <ul className="list-disc rounded-lg border border-danger/20 bg-danger/5 py-2 pl-7 pr-3 text-sm text-danger" aria-live="polite">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * Highest degree only, from a fixed list. The field of study is no longer asked (2026-11-28); a value saved
 * earlier stays in the resume, and choosing "Not stated" still clears it.
 */
function EducationFields({
  degree,
  onFieldChange,
}: {
  degree: string
  onFieldChange: (field: ResumeFieldKey, value: string) => void
}) {
  return (
    <div data-focus="education" className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">
        <span className="text-sm font-medium">Highest degree <span className="font-normal text-muted">(optional)</span></span>
        <Select value={degree} onChange={(event) => {
          onFieldChange('Degree', event.target.value)
          if (event.target.value === 'Not stated') onFieldChange('FieldOfStudy', '')
        }}>
          <option value="">Choose</option>
          {degreeLevels.map((level) => <option key={level} value={level}>{level}</option>)}
        </Select>
      </label>
    </div>
  )
}
