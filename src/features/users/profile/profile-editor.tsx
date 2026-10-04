'use client'

import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { Edit3, FileText, Plus, Save, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import type { UpdateProfile, UserResume } from '@/shared/schemas'
import { Button, Input, Textarea } from '@/shared/ui'
import { formatFileSize, removeListItem, updateList } from '../profile-form-utils'
import { hasResumeDraftInput, resumeFileAccept, type ResumeDraft, type ResumeFieldKey } from '../resume'
import { emptyCertification, emptySkill, formatFullDate, type CertificationDraft, type ProfileEditPanel, type SkillDraft } from './model'

export function ProfileEditDrawer({
  activePanel,
  profile,
  skills,
  certifications,
  resume,
  resumeDraft,
  attachedResumeFile,
  isSaving,
  onClose,
  onProfileChange,
  onSkillsChange,
  onCertificationsChange,
  onResumeFieldChange,
  onResumeFileChange,
  onResumeFileClear,
  onSaveProfile,
  onSaveSkills,
  onSaveCertifications,
  onSaveResume,
}: {
  activePanel: ProfileEditPanel
  profile: UpdateProfile
  skills: SkillDraft[]
  certifications: CertificationDraft[]
  resume: UserResume | null
  resumeDraft: ResumeDraft
  attachedResumeFile: File | null
  isSaving: boolean
  onClose: () => void
  onProfileChange: (patch: UpdateProfile) => void
  onSkillsChange: Dispatch<SetStateAction<SkillDraft[]>>
  onCertificationsChange: Dispatch<SetStateAction<CertificationDraft[]>>
  onResumeFieldChange: (field: ResumeFieldKey, value: string) => void
  onResumeFileChange: (file: File) => void
  onResumeFileClear: () => void
  onSaveProfile: () => void
  onSaveSkills: () => void
  onSaveCertifications: () => void
  onSaveResume: () => void
}) {
  if (!activePanel) return null

  const titles: Record<Exclude<ProfileEditPanel, null>, string> = {
    profile: 'Edit profile',
    skills: 'Edit skills',
    certifications: 'Edit certifications',
    resume: 'Edit CV / resume',
  }

  return (
    <div className="motion-overlay fixed inset-0 z-50 flex justify-end bg-black/24 p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="motion-drawer flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Profile editor</p>
            <h2 className="font-display text-2xl font-bold">{titles[activePanel]}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close editor" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activePanel === 'profile' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <EditField label="Name" value={profile.name} onChange={(value) => onProfileChange({ name: value })} />
              <EditField label="Phone" value={profile.phone} onChange={(value) => onProfileChange({ phone: value })} />
              <EditField label="Birthday" type="date" value={profile.birthDay} onChange={(value) => onProfileChange({ birthDay: value })} />
              <EditField label="Gender" value={profile.gender} onChange={(value) => onProfileChange({ gender: value })} />
              <EditField className="md:col-span-2" label="Headline" value={profile.headline} onChange={(value) => onProfileChange({ headline: value })} />
              <EditField label="Location" value={profile.location} onChange={(value) => onProfileChange({ location: value })} />
              <EditField label="Website" value={profile.website} onChange={(value) => onProfileChange({ website: value })} />
              <label className="grid gap-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Bio</span>
                <Textarea value={profile.bio ?? ''} onChange={(event) => onProfileChange({ bio: event.target.value })} />
              </label>
            </div>
          ) : null}

          {activePanel === 'skills' ? (
            <EditListShell onAdd={() => onSkillsChange((items) => [...items, { ...emptySkill, sortOrder: items.length }])}>
              {skills.map((skill, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_180px_40px]">
                  <Input value={skill.name} placeholder="React" onChange={(event) => updateList(onSkillsChange, index, { name: event.target.value })} />
                  <Input value={skill.level ?? ''} placeholder="advanced" onChange={(event) => updateList(onSkillsChange, index, { level: event.target.value })} />
                  <IconButton label="Remove skill" onClick={() => removeListItem(onSkillsChange, index)} />
                </div>
              ))}
            </EditListShell>
          ) : null}

          {activePanel === 'certifications' ? (
            <EditListShell onAdd={() => onCertificationsChange((items) => [...items, { ...emptyCertification, sortOrder: items.length }])}>
              {certifications.map((cert, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
                  <Input value={cert.name} placeholder="Certification name" onChange={(event) => updateList(onCertificationsChange, index, { name: event.target.value })} />
                  <Input value={cert.issuer ?? ''} placeholder="Issuer" onChange={(event) => updateList(onCertificationsChange, index, { issuer: event.target.value })} />
                  <Input type="date" value={cert.issuedAt ?? ''} onChange={(event) => updateList(onCertificationsChange, index, { issuedAt: event.target.value })} />
                  <Input type="date" value={cert.expiresAt ?? ''} onChange={(event) => updateList(onCertificationsChange, index, { expiresAt: event.target.value })} />
                  <Input value={cert.credentialUrl ?? ''} placeholder="Credential URL" onChange={(event) => updateList(onCertificationsChange, index, { credentialUrl: event.target.value })} />
                  <div className="flex gap-2">
                    <Input value={cert.credentialId ?? ''} placeholder="Credential ID" onChange={(event) => updateList(onCertificationsChange, index, { credentialId: event.target.value })} />
                    <IconButton label="Remove certification" onClick={() => removeListItem(onCertificationsChange, index)} />
                  </div>
                </div>
              ))}
            </EditListShell>
          ) : null}

          {activePanel === 'resume' ? (
            <div className="grid gap-4">
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <p className="text-sm font-bold">{resume?.updatedAt ? `Last saved ${formatFullDate(resume.updatedAt)}` : 'Add structured CV data'}</p>
                <p className="mt-1 text-xs leading-5 text-muted">These fields appear on your profile and support matching workflows.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <EditField label="Name" value={resumeDraft.Name} onChange={(value) => onResumeFieldChange('Name', value)} />
                <EditField label="Email" value={resumeDraft.Email} onChange={(value) => onResumeFieldChange('Email', value)} />
                <EditField label="Phone" value={resumeDraft.Phone} onChange={(value) => onResumeFieldChange('Phone', value)} />
                <EditField label="Location" value={resumeDraft.Location} onChange={(value) => onResumeFieldChange('Location', value)} />
                <EditField label="Role" value={resumeDraft.Role} onChange={(value) => onResumeFieldChange('Role', value)} />
                <EditField label="Industry" value={resumeDraft.Industry} onChange={(value) => onResumeFieldChange('Industry', value)} />
                <EditField label="Years experience" value={resumeDraft.YearsExperience} onChange={(value) => onResumeFieldChange('YearsExperience', value)} />
              </div>
              <EditText label="Summary" value={resumeDraft.Summary} onChange={(value) => onResumeFieldChange('Summary', value)} />
              <EditField label="Skills" value={resumeDraft.Skills} onChange={(value) => onResumeFieldChange('Skills', value)} />
              <EditText label="Experience" value={resumeDraft.Experience} onChange={(value) => onResumeFieldChange('Experience', value)} />
              <EditText label="Education" value={resumeDraft.Education} onChange={(value) => onResumeFieldChange('Education', value)} />
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:border-primary hover:text-primary">
                <FileText className="h-4 w-4" />
                Attach resume file
                <input
                  className="sr-only"
                  type="file"
                  accept={resumeFileAccept}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onResumeFileChange(file)
                    event.target.value = ''
                  }}
                />
              </label>
              {attachedResumeFile ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{attachedResumeFile.name}</p>
                    <p className="text-xs text-muted">{formatFileSize(attachedResumeFile.size)} ready to upload</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onResumeFileClear}>
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={isSaving}
            disabled={isSaving || (activePanel === 'resume' && !hasResumeDraftInput(resumeDraft))}
            onClick={
              activePanel === 'profile'
                ? onSaveProfile
                : activePanel === 'skills'
                  ? onSaveSkills
                  : activePanel === 'certifications'
                    ? onSaveCertifications
                    : onSaveResume
            }
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InlineEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:border-primary hover:text-primary"
      onClick={onClick}
    >
      <Edit3 className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export function OwnerUploadButton({
  label,
  icon,
  className,
  disabled,
  onChange,
}: {
  label: string
  icon: ReactNode
  className?: string
  disabled?: boolean
  onChange: (file: File) => void
}) {
  return (
    <label className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary ${className ?? ''}`}>
      {icon}
      {label}
      <input
        className="sr-only"
        type="file"
        accept={imageUploadAccept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            const validation = validateImageFile(file, { label })
            if (validation.valid) onChange(file)
            else toast.error(validation.message)
          }
          event.target.value = ''
        }}
      />
    </label>
  )
}

export function ResumeSnippet({ title, value }: { title: string; value?: string | null }) {
  if (!value) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm text-muted">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
        Not added yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <p className="line-clamp-5 text-sm leading-6 text-muted">{value}</p>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
  type = 'text',
  className,
}: {
  label: string
  value?: string | null
  onChange: (value: string) => void
  type?: string
  className?: string
}) {
  return (
    <label className={`grid gap-1 ${className ?? ''}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <Input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function EditText({ label, value, onChange }: { label: string; value?: string | null; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <Textarea value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function EditListShell({ children, onAdd }: { children: ReactNode; onAdd: () => void }) {
  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
