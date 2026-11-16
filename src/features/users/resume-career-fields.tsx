'use client'

import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { skillsApi, type FieldOfStudy } from '@/shared/api/endpoints/users'
import { Button, Input, Select, Textarea } from '@/shared/ui'
import type { ResumeDraft, ResumeFieldKey } from './resume'
import {
  careerFields,
  degreeLevels,
  emptyResumeJob,
  formatMonths,
  isCareerField,
  monthsInField,
  parseResumeJobs,
  resumeCareerProblems,
  serializeResumeJobs,
  type ResumeJob,
} from './resume-career'

/** Field, specialty, and dated jobs: the structured inputs the seniority preview reads. */
export function ResumeCareerFields({
  draft,
  onFieldChange,
}: {
  draft: Pick<ResumeDraft, 'Industry' | 'Specialty' | 'Jobs'> & Partial<Pick<ResumeDraft, 'Degree' | 'FieldOfStudy'>>
  onFieldChange: (field: ResumeFieldKey, value: string) => void
}) {
  const jobs = parseResumeJobs(draft.Jobs)
  const problems = resumeCareerProblems(draft)
  const field = draft.Industry ?? ''
  const months = isCareerField(field) ? monthsInField(jobs, field) : 0

  function setJobs(next: ResumeJob[]) {
    onFieldChange('Jobs', next.length ? serializeResumeJobs(next) : '')
  }
  function updateJob(index: number, change: Partial<ResumeJob>) {
    setJobs(jobs.map((job, position) => (position === index ? { ...job, ...change } : job)))
  }

  return (
    <div data-focus="career" className="grid gap-3 rounded-lg border border-border p-3 sm:p-4">
      <div>
        <h4 className="font-display text-base font-bold">Field and specialty</h4>
        <p className="mt-1 text-xs leading-5 text-muted">
          Required. The AI seniority preview judges your experience and skills in this field.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Field <span className="text-danger">*</span></span>
          <Select value={field} aria-invalid={!isCareerField(field)} onChange={(event) => onFieldChange('Industry', event.target.value)}>
            <option value="">Choose your field</option>
            {field && !isCareerField(field) ? <option value={field}>{field} (choose from the list)</option> : null}
            {careerFields.map((name) => <option key={name} value={name}>{name}</option>)}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Specialty <span className="text-danger">*</span></span>
          <Input value={draft.Specialty ?? ''} maxLength={80} placeholder="For example: Fullstack, Payroll, Pastry"
            aria-invalid={!draft.Specialty?.trim()} onChange={(event) => onFieldChange('Specialty', event.target.value)} />
        </label>
      </div>

      <div data-focus="jobs" className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="font-display text-base font-bold">Jobs</h4>
            <p className="text-xs leading-5 text-muted">Add each job with its dates and field, so time in your field can be counted.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => setJobs([...jobs, { ...emptyResumeJob, field: isCareerField(field) ? field : '' }])}>
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
              <label className="grid gap-1">
                <span className="text-xs font-semibold">Field of this job</span>
                <Select value={job.field} onChange={(event) => updateJob(index, { field: event.target.value })}>
                  <option value="">Choose</option>
                  {careerFields.map((name) => <option key={name} value={name}>{name}</option>)}
                </Select>
              </label>
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
        {isCareerField(field) ? (
          // Years of experience are counted from these jobs only; there is no separate box to type them in.
          <p data-focus="years" className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-muted">
            Experience in {field}: <span className="font-semibold text-foreground">{months ? formatMonths(months) : 'none yet'}</span>
            <span className="block text-xs">Counted from the start and end months of your jobs in this field.</span>
          </p>
        ) : null}
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
