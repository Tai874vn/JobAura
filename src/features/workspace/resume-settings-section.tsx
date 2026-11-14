'use client'

import { CheckCircle2, FileJson, FileText, Sparkles } from 'lucide-react'
import type { UserResume } from '@/shared/schemas'
import { Button, Card, CardContent, Input, Textarea } from '@/shared/ui'
import { formatFileSize } from '@/features/users/profile-form-utils'
import { cn } from '@/shared/lib/utils'
import {
  hasResumeDraftInput,
  resumeFileAccept,
  resumeSkills,
  type ResumeDraft,
  type ResumeFieldKey,
} from '@/features/users/resume'
import { ResumeCareerFields } from '@/features/users/resume-career-fields'
import { SkillPicker } from '@/features/users/skill-picker'
import { canRetryResumeAi, isResumeAiPending, resumeAiStatus, unrecognisedSkills } from '@/features/users/resume-ai'
import type { FoundSkill } from '@/shared/api/endpoints/users'
import { resumeCareerProblems } from '@/features/users/resume-career'

export function ResumeSettingsSection({
  resume,
  draft,
  attachedFile,
  isLoading,
  isImporting,
  isPredicting,
  onFieldChange,
  onClearAttachedFile,
  onImport,
  onPredictSeniority,
  onResumeFile,
  foundSkills = [],
}: {
  resume: UserResume | null
  draft: ResumeDraft
  attachedFile: File | null
  isLoading: boolean
  isImporting: boolean
  isPredicting: boolean
  onFieldChange: (field: ResumeFieldKey, value: string) => void
  onClearAttachedFile: () => void
  onImport: () => void
  onPredictSeniority: () => void
  onResumeFile: (file: File) => void
  /** Dictionary skills found in the attached CV, offered for the user to add. */
  foundSkills?: FoundSkill[]
}) {
  const careerProblems = resumeCareerProblems(draft)
  const canImport = hasResumeDraftInput(draft) && careerProblems.length === 0

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Resume details</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
          Review your experience, attach a CV, and save the details used for job matching.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_288px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">Career fields</h3>
                <p className="mt-1 text-sm text-muted">Fill the resume fields directly, or upload a CV file to extract the fields.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {resume ? 'Saved resume' : 'New resume'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <ResumeField label="Name" value={draft.Name} onChange={(value) => onFieldChange('Name', value)} />
              <ResumeField label="Email" value={draft.Email} onChange={(value) => onFieldChange('Email', value)} />
              <ResumeField label="Phone" value={draft.Phone} onChange={(value) => onFieldChange('Phone', value)} />
              <ResumeField label="Location" value={draft.Location} onChange={(value) => onFieldChange('Location', value)} />
              <ResumeField label="Current job title" value={draft.Role} onChange={(value) => onFieldChange('Role', value)} />
              <ResumeField label="Years experience" value={draft.YearsExperience} onChange={(value) => onFieldChange('YearsExperience', value)} />
            </div>

            <ResumeCareerFields draft={draft} onFieldChange={onFieldChange} />

            <ResumeTextarea label="Summary" value={draft.Summary} onChange={(value) => onFieldChange('Summary', value)} />
            <SkillPicker value={resumeSkills(draft.Skills)} field={draft.Industry} suggestions={foundSkills}
              onChange={(names) => onFieldChange('Skills', names.join(', '))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ResumeTextarea label="Other experience notes" className="min-h-24" value={draft.Experience} onChange={(value) => onFieldChange('Experience', value)} />
              <ResumeTextarea label="Education" className="min-h-24" value={draft.Education} onChange={(value) => onFieldChange('Education', value)} />
            </div>
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer rounded text-sm font-semibold text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">Full extracted text</summary>
              <div className="mt-3">
                <ResumeTextarea label="Extracted text" className="min-h-32" value={draft.Text} onChange={(value) => onFieldChange('Text', value)} />
              </div>
            </details>

            <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Extract CV or resume</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Supports PDF, DOC, and DOCX up to 10MB. PDF and DOCX are extracted for review before saving.</p>
                  <p className="mt-1 text-xs leading-5 text-muted">For best results, attach DOCX, PDF, or another readable document instead of an image, which cannot be read here.</p>
                </div>
                <label className="interaction inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold hover:border-primary hover:bg-primary/5 hover:text-primary focus-within:ring-2 focus-within:ring-primary-bright">
                  <FileText className="h-4 w-4" />
                  Attach file
                  <input
                    className="sr-only"
                    type="file"
                    accept={resumeFileAccept}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) onResumeFile(file)
                      event.target.value = ''
                    }}
                  />
                </label>
              </div>
              {attachedFile ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{attachedFile.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(attachedFile.size)} ready to upload</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClearAttachedFile}>Remove</Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-muted">
                {careerProblems.length ? 'Fill the required field and specialty, and complete each job, before saving. ' : null}
                If a file is attached, the original document is uploaded with the reviewed resume data. Non-extractable files require manual fields before saving.
              </p>
              <Button loading={isImporting} disabled={!canImport} onClick={onImport}>
                <FileJson className="h-4 w-4" />
                {attachedFile ? 'Upload and save' : 'Save resume'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="min-w-0 lg:sticky lg:top-24">
          <ResumePreview
            resume={resume}
            data={draft}
            isLoading={isLoading}
            isPredicting={isPredicting}
            onPredictSeniority={onPredictSeniority}
          />
        </div>
      </div>
    </div>
  )
}

function ResumePreview({
  resume,
  data,
  isLoading,
  isPredicting,
  onPredictSeniority,
}: {
  resume: UserResume | null
  data: ResumeDraft
  isLoading: boolean
  isPredicting: boolean
  onPredictSeniority: () => void
}) {
  const skills = resumeSkills(data.Skills)
  const prediction = seniorityDetails(resume)
  const aiStatus = resumeAiStatus(resume)
  const pending = isResumeAiPending(resume)
  const retry = canRetryResumeAi(resume)
  const unknownSkills = unrecognisedSkills(resume)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold">Preview</h3>
            <p className="mt-1 text-sm text-muted">{resume?.updatedAt ? `Last imported ${formatDate(resume.updatedAt)}` : 'Resume data preview'}</p>
          </div>
          {resume ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">AI seniority</p>
              <h4 className="mt-1 font-display text-xl font-bold">{resume?.predictedSeniority ?? 'Not evaluated yet'}</h4>
              {prediction.tier ? <p className="text-sm font-semibold text-primary">{prediction.tier}</p> : null}
              <p className="mt-1 text-xs leading-5 text-muted">
                {resume?.predictedSeniorityAt
                  // No percentage: the model applies fixed rules, so it is near 100% and would read as certainty.
                  ? `Evaluated ${formatDate(resume.predictedSeniorityAt)}. A preview from years in your field and the skills and work you describe, not a test result.`
                  : 'Save your resume, then run AI evaluation when you need it.'}
              </p>
              {prediction.reasons.length ? (
                <ul className="mt-2 list-disc pl-4 text-xs leading-5 text-muted" aria-label="Why this level">
                  {prediction.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              ) : null}
              <div aria-live="polite">
                {pending ? (
                  <p className="mt-2 text-xs font-semibold text-primary">AI evaluation in progress…</p>
                ) : null}
                {(retry || aiStatus === 'NEEDS_INPUT') && resume?.aiStatusMessage ? (
                  <p role={retry ? 'alert' : undefined}
                    className={cn('mt-2 rounded border px-2 py-1 text-xs leading-5',
                      retry ? 'border-danger/30 bg-danger/5 text-danger' : 'border-border text-muted')}>
                    {resume.aiStatusMessage}
                  </p>
                ) : null}
                {unknownSkills.length ? (
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Not in the skill list: {unknownSkills.join(', ')}. Choose them from the list to count them.
                  </p>
                ) : null}
              </div>
            </div>
            <Button type="button" size="sm" variant="secondary" loading={isPredicting} disabled={!resume || pending} onClick={onPredictSeniority}>
              <Sparkles className="h-4 w-4" />
              {retry ? 'Try again' : pending ? 'Queued' : resume?.predictedSeniority ? 'Run again' : 'Predict'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 text-sm text-muted">Loading resume...</div>
        ) : hasResumeDraftInput(data) ? (
          <div className="mt-5 grid gap-4">
            <h4 className="font-display text-2xl font-bold">{data.Name ?? 'Unnamed resume'}</h4>
            <div className="grid gap-2 text-sm text-muted">
              <ResumeMeta label="Email" value={data.Email} />
              <ResumeMeta label="Phone" value={data.Phone} />
              <ResumeMeta label="Location" value={data.Location} />
              <ResumeMeta label="Job title" value={data.Role} />
              <ResumeMeta label="Field" value={data.Industry} />
              <ResumeMeta label="Specialty" value={data.Specialty} />
              <ResumeMeta label="Years experience" value={data.YearsExperience} />
            </div>
            {data.Summary ? <p className="rounded-lg bg-surface-muted p-3 text-sm leading-6 text-muted">{data.Summary}</p> : null}
            {skills.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => <span key={skill} className="rounded bg-accent/30 px-2 py-1 text-xs font-semibold text-foreground">{skill}</span>)}
                </div>
              </div>
            ) : null}
            <ResumeTextBlock title="Experience" value={data.Experience} />
            <ResumeTextBlock title="Education" value={data.Education} />
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm leading-6 text-muted">
            Fill the resume fields or extract a CV file to preview the data before saving.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ResumeField({ label, value, onChange }: { label: string; value?: string | null; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <Input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ResumeTextarea({ label, value, onChange, className = 'min-h-20' }: { label: string; value?: string | null; onChange: (value: string) => void; className?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-semibold">{label}</span>
      <Textarea className={className} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ResumeMeta({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function ResumeTextBlock({ title, value }: { title: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <p className="line-clamp-4 text-sm leading-6 text-muted">{value}</p>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

/** Display tier and reasons the AI service returns with a prediction (stored in its metadata). */
export function seniorityDetails(resume: UserResume | null): { tier: string | null; reasons: string[] } {
  const features = resume?.predictedSeniorityMetadata?.features
  if (!features || typeof features !== 'object') return { tier: null, reasons: [] }
  const { tier, reasons } = features as { tier?: unknown; reasons?: unknown }
  return {
    tier: typeof tier === 'string' ? tier : null,
    reasons: Array.isArray(reasons) ? reasons.filter((reason): reason is string => typeof reason === 'string').slice(0, 6) : [],
  }
}
