'use client'

import { CheckCircle2, FileJson, FileText, Sparkles } from 'lucide-react'
import type { UserResume } from '@/shared/schemas'
import { Button, Card, CardContent, Input, Textarea } from '@/shared/ui'
import { formatFileSize } from '@/features/users/profile-form-utils'
import {
  hasResumeDraftInput,
  resumeFileAccept,
  resumeSchemaVersion,
  resumeSkills,
  type ResumeDraft,
  type ResumeFieldKey,
} from '@/features/users/resume'

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
}) {
  const canImport = hasResumeDraftInput(draft)

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Resume intelligence</p>
        <h2 className="mt-1 font-display text-3xl font-bold">Resume details</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Maintain structured CV data for AI matching and future public profile display.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardContent className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-bold">Career fields</h3>
                <p className="mt-1 text-sm text-muted">Fill the resume fields directly, or upload a CV file to extract the fields.</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {resumeSchemaVersion}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ResumeField label="Name" value={draft.Name} onChange={(value) => onFieldChange('Name', value)} />
              <ResumeField label="Email" value={draft.Email} onChange={(value) => onFieldChange('Email', value)} />
              <ResumeField label="Phone" value={draft.Phone} onChange={(value) => onFieldChange('Phone', value)} />
              <ResumeField label="Location" value={draft.Location} onChange={(value) => onFieldChange('Location', value)} />
              <ResumeField label="Role" value={draft.Role} onChange={(value) => onFieldChange('Role', value)} />
              <ResumeField label="Industry" value={draft.Industry} onChange={(value) => onFieldChange('Industry', value)} />
              <ResumeField label="Years experience" value={draft.YearsExperience} onChange={(value) => onFieldChange('YearsExperience', value)} />
            </div>

            <ResumeTextarea label="Summary" value={draft.Summary} onChange={(value) => onFieldChange('Summary', value)} />
            <ResumeField label="Skills" value={draft.Skills} onChange={(value) => onFieldChange('Skills', value)} />
            <ResumeTextarea label="Experience" className="min-h-36" value={draft.Experience} onChange={(value) => onFieldChange('Experience', value)} />
            <ResumeTextarea label="Education" value={draft.Education} onChange={(value) => onFieldChange('Education', value)} />
            <ResumeTextarea label="Full extracted text" className="min-h-40" value={draft.Text} onChange={(value) => onFieldChange('Text', value)} />

            <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">Extract CV or resume</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Supports PDF, DOC, and DOCX up to 10MB. PDF and DOCX are extracted for review before saving.</p>
                  <p className="mt-1 text-xs leading-5 text-muted">For best results, attach DOCX, PDF, or another readable document instead of an image, which cannot be read here.</p>
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:border-primary hover:text-primary">
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
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2">
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
                If a file is attached, the original document is uploaded with the reviewed resume data. Non-extractable files require manual fields before saving.
              </p>
              <Button loading={isImporting} disabled={!canImport} onClick={onImport}>
                <FileJson className="h-4 w-4" />
                {attachedFile ? 'Upload and save' : 'Save resume'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ResumePreview
          resume={resume}
          data={draft}
          isLoading={isLoading}
          isPredicting={isPredicting}
          onPredictSeniority={onPredictSeniority}
        />
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
  const confidence = resume?.predictedSeniorityConfidence != null
    ? Math.round(resume.predictedSeniorityConfidence * 100)
    : null

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold">Preview</h3>
            <p className="mt-1 text-sm text-muted">{resume?.updatedAt ? `Last imported ${formatDate(resume.updatedAt)}` : 'Resume data preview'}</p>
          </div>
          {resume ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">AI seniority</p>
              <h4 className="mt-1 font-display text-xl font-bold">{resume?.predictedSeniority ?? 'Not evaluated yet'}</h4>
              <p className="mt-1 text-xs leading-5 text-muted">
                {resume?.predictedSeniorityAt
                  ? `Evaluated ${formatDate(resume.predictedSeniorityAt)}${confidence != null ? ` with ${confidence}% confidence` : ''}.`
                  : 'Save your resume, then run AI evaluation when you need it.'}
              </p>
            </div>
            <Button type="button" size="sm" variant="secondary" loading={isPredicting} disabled={!resume} onClick={onPredictSeniority}>
              <Sparkles className="h-4 w-4" />
              {resume?.predictedSeniority ? 'Run again' : 'Predict'}
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
              <ResumeMeta label="Role" value={data.Role} />
              <ResumeMeta label="Industry" value={data.Industry} />
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
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <Input value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ResumeTextarea({ label, value, onChange, className }: { label: string; value?: string | null; onChange: (value: string) => void; className?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
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
