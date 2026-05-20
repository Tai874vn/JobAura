'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  CheckCircle2,
  CreditCard,
  FileJson,
  FileText,
  ImageUp,
  KeyRound,
  LayoutDashboard,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { ProfileCertification, ProfilePortfolioItem, ProfileSkill, UpdateProfile, UserProfile, UserResume } from '@/shared/schemas'
import { getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button, Card, CardContent, Input, Spinner, Textarea } from '@/shared/ui'
import { calculateProfileCompletion } from '@/features/users/profile-posts'
import {
  canExtractResumeFile,
  extractResumeFile,
  hasResumeDraftInput,
  resumeFileAccept,
  resumeDraftFromData,
  resumeDraftToImportPayload,
  resumeSchemaVersion,
  resumeSkills,
  validateResumeFile,
  type ResumeDraft,
  type ResumeFieldKey,
} from '@/features/users/resume'

type SkillDraft = Omit<ProfileSkill, 'id'>
type CertificationDraft = Omit<ProfileCertification, 'id'>
type PortfolioDraft = Omit<ProfilePortfolioItem, 'id'>
type SettingSection = 'overview' | 'profile' | 'resume' | 'account' | 'security' | 'appearance' | 'notifications' | 'billing'

const emptySkill: SkillDraft = { name: '', level: '', sortOrder: 0 }
const emptyCertification: CertificationDraft = {
  name: '',
  issuer: '',
  issuedAt: '',
  expiresAt: '',
  credentialUrl: '',
  credentialId: '',
  sortOrder: 0,
}
const emptyPortfolio: PortfolioDraft = { title: '', description: '', image: '', url: '', sortOrder: 0 }

const settingSections: Array<{
  id: SettingSection
  title: string
  description: string
  icon: React.ReactNode
}> = [
  { id: 'overview', title: 'Overview', description: 'Choose what to configure', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'profile', title: 'Profile', description: 'Public identity and portfolio', icon: <UserRound className="h-4 w-4" /> },
  { id: 'resume', title: 'Resume', description: 'Import CV data for AI matching', icon: <FileJson className="h-4 w-4" /> },
  { id: 'account', title: 'Account', description: 'Email, role, and basic account data', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'security', title: 'Security', description: 'Password and session controls', icon: <KeyRound className="h-4 w-4" /> },
  { id: 'appearance', title: 'Appearance', description: 'Theme and display preferences', icon: <Palette className="h-4 w-4" /> },
  { id: 'notifications', title: 'Notifications', description: 'Marketplace alerts and email', icon: <Bell className="h-4 w-4" /> },
  { id: 'billing', title: 'Billing', description: 'Payments and invoices', icon: <CreditCard className="h-4 w-4" /> },
]

export function SettingsPage() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const profileQuery = useQuery({ queryKey: queryKeys.myProfile, queryFn: usersApi.myProfile })
  const resumeQuery = useQuery({ queryKey: queryKeys.myResume, queryFn: usersApi.myResume })
  const profile = profileQuery.data?.content
  const resume = resumeQuery.data?.content ?? null

  const [activeSection, setActiveSection] = useState<SettingSection>('overview')
  const [basic, setBasic] = useState<UpdateProfile>({})
  const [skills, setSkills] = useState<SkillDraft[]>([])
  const [certifications, setCertifications] = useState<CertificationDraft[]>([])
  const [portfolio, setPortfolio] = useState<ProfilePortfolioItem[]>([])
  const [newPortfolio, setNewPortfolio] = useState<PortfolioDraft>(emptyPortfolio)
  const [resumeDraft, setResumeDraft] = useState<Partial<ResumeDraft>>({})
  const [attachedResumeFile, setAttachedResumeFile] = useState<File | null>(null)

  useEffect(() => {
    if (!profile) return
    const timer = window.setTimeout(() => {
      setBasic({
        name: profile.name ?? '',
        phone: profile.phone ?? '',
        birthDay: profile.birthDay ?? '',
        gender: profile.gender ?? '',
        headline: profile.headline ?? '',
        bio: profile.bio ?? '',
        location: profile.location ?? '',
        website: profile.website ?? '',
      })
      setSkills((profile.skills ?? []).map(({ name, level, sortOrder }, index) => ({ name, level: level ?? '', sortOrder: sortOrder ?? index })))
      setCertifications(
        (profile.certifications ?? []).map((item, index) => ({
          name: item.name,
          issuer: item.issuer ?? '',
          issuedAt: toDateInput(item.issuedAt),
          expiresAt: toDateInput(item.expiresAt),
          credentialUrl: item.credentialUrl ?? '',
          credentialId: item.credentialId ?? '',
          sortOrder: item.sortOrder ?? index,
        }))
      )
      setPortfolio(profile.portfolio ?? profile.portfolioItems ?? [])
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile])

  function refreshProfile(next?: UserProfile) {
    if (next) {
      queryClient.setQueryData(queryKeys.myProfile, { ...profileQuery.data, content: next })
      setUser(next)
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.myProfile })
    queryClient.invalidateQueries({ queryKey: queryKeys.me })
  }

  const saveBasic = useMutation({
    mutationFn: () => usersApi.updateMyProfile(cleanObject(basic)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      toast.success('Profile updated')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to update profile')),
  })

  const saveSkills = useMutation({
    mutationFn: () => usersApi.replaceSkills(skills.map((skill, index) => cleanObject({ ...skill, sortOrder: index })).filter((skill) => skill.name)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      toast.success('Skills saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save skills')),
  })

  const saveCertifications = useMutation({
    mutationFn: () =>
      usersApi.replaceCertifications(
        certifications.map((cert, index) => cleanObject({ ...cert, sortOrder: index })).filter((cert) => cert.name)
      ),
    onSuccess: (response) => {
      refreshProfile(response.content)
      toast.success('Certifications saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save certifications')),
  })

  const createPortfolio = useMutation({
    mutationFn: () => usersApi.createPortfolioItem(cleanObject(newPortfolio)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      setNewPortfolio(emptyPortfolio)
      toast.success('Portfolio item created')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to create portfolio item')),
  })

  const updatePortfolio = useMutation({
    mutationFn: (item: ProfilePortfolioItem) => usersApi.updatePortfolioItem(Number(item.id), cleanObject(item)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      toast.success('Portfolio item updated')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to update portfolio item')),
  })

  const deletePortfolio = useMutation({
    mutationFn: usersApi.deletePortfolioItem,
    onSuccess: () => {
      refreshProfile()
      toast.success('Portfolio item deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete portfolio item')),
  })

  const uploadAvatar = useUploadMutation(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useUploadMutation(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
  const saveResume = useMutation({
    mutationFn: async () => {
      const payload = resumeDraftToImportPayload(currentResumeDraft)

      if (!hasResumeDraftInput(currentResumeDraft)) {
        throw new Error('Fill at least one resume field before saving.')
      }

      const response = await usersApi.importResume(payload)

      if (attachedResumeFile) {
        return usersApi.uploadResumeFile(attachedResumeFile)
      }

      return response
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.myResume, { ...resumeQuery.data, content: response.content ?? null })
      queryClient.invalidateQueries({ queryKey: queryKeys.myResume })
      setResumeDraft({})
      setAttachedResumeFile(null)
      toast.success(attachedResumeFile ? 'Resume file and details saved' : 'Resume imported')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save resume')),
  })

  const isSaving = useMemo(
    () =>
      saveBasic.isPending ||
      saveSkills.isPending ||
      saveCertifications.isPending ||
      createPortfolio.isPending ||
      updatePortfolio.isPending ||
      deletePortfolio.isPending,
    [createPortfolio.isPending, deletePortfolio.isPending, saveBasic.isPending, saveCertifications.isPending, saveSkills.isPending, updatePortfolio.isPending]
  )

  const currentResumeDraft = { ...resumeDraftFromData(resume?.data), ...resumeDraft }

  function submitResumeImport() {
    saveResume.mutate()
  }

  function updateResumeField(field: ResumeFieldKey, value: string) {
    setResumeDraft((draft) => ({ ...draft, [field]: value }))
  }

  async function loadResumeFile(file: File) {
    const validation = validateResumeFile(file)
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    setAttachedResumeFile(file)

    if (!canExtractResumeFile(file)) {
      toast.info('Resume file attached. Browser extraction supports PDF and DOCX, so fill or edit the fields before saving.')
      return
    }

    try {
      const parsed = await extractResumeFile(file)
      setResumeDraft(resumeDraftFromData(parsed.data))
      toast.success('Resume extracted and attached')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Resume attached, but extraction failed. You can fill the fields manually.')
    }
  }

  if (profileQuery.isPending) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (!profile) {
    return <div className="container-page py-8 text-sm text-muted">Unable to load your editable profile.</div>
  }

  const avatarUrl = resolveAssetUrl(profile.avatar)
  const bypassAvatarOptimizer = shouldBypassImageOptimizer(profile.avatar)
  const completion = calculateProfileCompletion(profile)

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Settings</p>
        <h1 className="font-display text-4xl font-bold">Choose what to configure</h1>
        <p className="max-w-2xl text-sm text-muted">Manage your profile, account access, notifications, and workspace preferences from one place.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="grid gap-1 p-2">
              {settingSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${
                    activeSection === section.id ? 'bg-primary text-white' : 'hover:bg-surface-muted'
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className={activeSection === section.id ? 'mt-0.5 text-white' : 'mt-0.5 text-primary'}>{section.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{section.title}</span>
                    <span className={`mt-0.5 block text-xs leading-5 ${activeSection === section.id ? 'text-white/80' : 'text-muted'}`}>
                      {section.description}
                    </span>
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">
          {activeSection === 'overview' ? (
            <SettingsOverview profile={profile} completion={completion} resume={resume} onSelect={setActiveSection} />
          ) : null}

          {activeSection === 'profile' ? (
            <div className="grid gap-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="font-display text-3xl font-bold">Profile settings</h2>
                  <p className="mt-1 text-sm text-muted">Update your public marketplace profile, skills, certifications, and portfolio.</p>
                </div>
                <Button disabled={isSaving} onClick={() => saveBasic.mutate()}>
                  <Save className="h-4 w-4" />
                  Save profile
                </Button>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="grid gap-6">
                  <Card>
                    <CardContent className="grid gap-4 p-5 md:grid-cols-2">
                      <Field label="Name" value={basic.name} onChange={(value) => setBasic((state) => ({ ...state, name: value }))} />
                      <Field label="Phone" value={basic.phone} onChange={(value) => setBasic((state) => ({ ...state, phone: value }))} />
                      <Field label="Birthday" type="date" value={basic.birthDay} onChange={(value) => setBasic((state) => ({ ...state, birthDay: value }))} />
                      <Field label="Gender" value={basic.gender} onChange={(value) => setBasic((state) => ({ ...state, gender: value }))} />
                      <Field className="md:col-span-2" label="Headline" value={basic.headline} onChange={(value) => setBasic((state) => ({ ...state, headline: value }))} />
                      <Field label="Location" value={basic.location} onChange={(value) => setBasic((state) => ({ ...state, location: value }))} />
                      <Field label="Website" value={basic.website} onChange={(value) => setBasic((state) => ({ ...state, website: value }))} />
                      <label className="grid gap-1 md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Bio</span>
                        <Textarea value={basic.bio ?? ''} onChange={(event) => setBasic((state) => ({ ...state, bio: event.target.value }))} />
                      </label>
                    </CardContent>
                  </Card>

                  <EditorSection title="Skills" onAdd={() => setSkills((items) => [...items, { ...emptySkill, sortOrder: items.length }])} onSave={() => saveSkills.mutate()}>
                    {skills.map((skill, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_180px_40px]">
                        <Input value={skill.name} placeholder="React" onChange={(event) => updateList(setSkills, index, { name: event.target.value })} />
                        <Input value={skill.level ?? ''} placeholder="advanced" onChange={(event) => updateList(setSkills, index, { level: event.target.value })} />
                        <IconButton label="Remove skill" onClick={() => removeListItem(setSkills, index)} />
                      </div>
                    ))}
                  </EditorSection>

                  <EditorSection title="Certifications" onAdd={() => setCertifications((items) => [...items, { ...emptyCertification, sortOrder: items.length }])} onSave={() => saveCertifications.mutate()}>
                    {certifications.map((cert, index) => (
                      <div key={index} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-2">
                        <Input value={cert.name} placeholder="Certification name" onChange={(event) => updateList(setCertifications, index, { name: event.target.value })} />
                        <Input value={cert.issuer ?? ''} placeholder="Issuer" onChange={(event) => updateList(setCertifications, index, { issuer: event.target.value })} />
                        <Input type="date" value={cert.issuedAt ?? ''} onChange={(event) => updateList(setCertifications, index, { issuedAt: event.target.value })} />
                        <Input type="date" value={cert.expiresAt ?? ''} onChange={(event) => updateList(setCertifications, index, { expiresAt: event.target.value })} />
                        <Input value={cert.credentialUrl ?? ''} placeholder="Credential URL" onChange={(event) => updateList(setCertifications, index, { credentialUrl: event.target.value })} />
                        <div className="flex gap-2">
                          <Input value={cert.credentialId ?? ''} placeholder="Credential ID" onChange={(event) => updateList(setCertifications, index, { credentialId: event.target.value })} />
                          <IconButton label="Remove certification" onClick={() => removeListItem(setCertifications, index)} />
                        </div>
                      </div>
                    ))}
                  </EditorSection>
                </div>

                <aside className="grid content-start gap-6">
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-primary font-display text-xl font-bold text-white">
                          {avatarUrl ? (
                            <Image src={avatarUrl} alt="" fill unoptimized={bypassAvatarOptimizer} className="object-cover" sizes="56px" />
                          ) : (
                            initials(profile.name)
                          )}
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold">{profile.name}</h3>
                          <p className="text-sm text-muted">{profile.email}</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3">
                        <UploadField label="Upload avatar" icon={<Upload className="h-4 w-4" />} onChange={(file) => uploadAvatar.mutate(file)} />
                        <UploadField label="Upload cover" icon={<ImageUp className="h-4 w-4" />} onChange={(file) => uploadCover.mutate(file)} />
                      </div>
                    </CardContent>
                  </Card>

                  <EditorSection title="New portfolio item" onSave={() => createPortfolio.mutate()} saveLabel="Create">
                    <PortfolioFields item={newPortfolio} onChange={(patch) => setNewPortfolio((item) => ({ ...item, ...patch }))} />
                  </EditorSection>

                  <EditorSection title="Portfolio" hideActions>
                    {portfolio.map((item, index) => (
                      <div key={item.id ?? index} className="grid gap-3 rounded-lg border border-border p-3">
                        <PortfolioFields item={item} onChange={(patch) => updateList(setPortfolio, index, patch)} />
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" disabled={!item.id} onClick={() => updatePortfolio.mutate(item)}>
                            Save
                          </Button>
                          <Button variant="danger" size="sm" disabled={!item.id} onClick={() => item.id && deletePortfolio.mutate(item.id)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </EditorSection>
                </aside>
              </div>
            </div>
          ) : null}

          {activeSection === 'resume' ? (
            <ResumeImportSection
              resume={resume}
              draft={currentResumeDraft}
              attachedFile={attachedResumeFile}
              isLoading={resumeQuery.isPending}
              isImporting={saveResume.isPending}
              onFieldChange={updateResumeField}
              onClearAttachedFile={() => setAttachedResumeFile(null)}
              onImport={submitResumeImport}
              onResumeFile={loadResumeFile}
            />
          ) : null}

          {activeSection !== 'overview' && activeSection !== 'profile' && activeSection !== 'resume' ? <SettingsPlaceholder section={activeSection} /> : null}
        </main>
      </div>
    </div>
  )
}

function SettingsOverview({
  profile,
  completion,
  resume,
  onSelect,
}: {
  profile: UserProfile
  completion: number
  resume: UserResume | null
  onSelect: (section: SettingSection) => void
}) {
  const cards = settingSections.filter((section) => section.id !== 'overview')

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_240px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Profile readiness</p>
            <h2 className="mt-1 font-display text-3xl font-bold">{completion}% complete</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              A complete profile gives buyers enough context to trust your services before they open a conversation.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Signed in as</p>
            <p className="mt-2 truncate font-display text-xl font-bold">{profile.name}</p>
            <p className="mt-1 truncate text-sm text-muted">{profile.email}</p>
            <div className="mt-4 grid gap-2">
              <Button className="w-full" variant="secondary" onClick={() => onSelect('profile')}>
                Edit profile
              </Button>
              <Button className="w-full" variant={resume ? 'secondary' : 'primary'} onClick={() => onSelect('resume')}>
                {resume ? 'View resume' : 'Import resume'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((section) => (
          <button
            key={section.id}
            type="button"
            className="rounded-lg border border-border bg-white p-4 text-left transition hover:border-primary hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            onClick={() => onSelect(section.id)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{section.icon}</span>
            <span className="mt-4 block font-display text-xl font-bold">{section.title}</span>
            <span className="mt-1 block text-sm leading-6 text-muted">{section.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ResumeImportSection({
  resume,
  draft,
  attachedFile,
  isLoading,
  isImporting,
  onFieldChange,
  onClearAttachedFile,
  onImport,
  onResumeFile,
}: {
  resume: UserResume | null
  draft: ResumeDraft
  attachedFile: File | null
  isLoading: boolean
  isImporting: boolean
  onFieldChange: (field: ResumeFieldKey, value: string) => void
  onClearAttachedFile: () => void
  onImport: () => void
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
              <Field label="Name" value={draft.Name} onChange={(value) => onFieldChange('Name', value)} />
              <Field label="Email" value={draft.Email} onChange={(value) => onFieldChange('Email', value)} />
              <Field label="Phone" value={draft.Phone} onChange={(value) => onFieldChange('Phone', value)} />
              <Field label="Location" value={draft.Location} onChange={(value) => onFieldChange('Location', value)} />
            </div>

            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Summary</span>
              <Textarea value={draft.Summary} onChange={(event) => onFieldChange('Summary', event.target.value)} />
            </label>
            <Field label="Skills" value={draft.Skills} onChange={(value) => onFieldChange('Skills', value)} />
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Experience</span>
              <Textarea className="min-h-36" value={draft.Experience} onChange={(event) => onFieldChange('Experience', event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Education</span>
              <Textarea value={draft.Education} onChange={(event) => onFieldChange('Education', event.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Full extracted text</span>
              <Textarea className="min-h-40" value={draft.Text} onChange={(event) => onFieldChange('Text', event.target.value)} />
            </label>

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
                  <Button variant="ghost" size="sm" onClick={onClearAttachedFile}>
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs leading-5 text-muted">
                If a file is attached, the original document is uploaded with the reviewed resume data. Non-extractable files require manual fields before saving.
              </p>
              <Button disabled={!canImport || isImporting} onClick={onImport}>
                <FileJson className="h-4 w-4" />
                {isImporting ? 'Saving...' : attachedFile ? 'Upload and save' : 'Save resume'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ResumePreviewCard resume={resume} data={draft} isLoading={isLoading} />
      </div>
    </div>
  )
}

function ResumePreviewCard({
  resume,
  data,
  isLoading,
}: {
  resume: UserResume | null
  data: ResumeDraft
  isLoading: boolean
}) {
  const skills = resumeSkills(data?.Skills)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-bold">Preview</h3>
            <p className="mt-1 text-sm text-muted">{resume?.updatedAt ? `Last imported ${formatSettingsDate(resume.updatedAt)}` : 'Resume data preview'}</p>
          </div>
          {resume ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
        </div>

        {isLoading ? (
          <div className="mt-5 text-sm text-muted">Loading resume...</div>
        ) : hasResumeDraftInput(data) ? (
          <div className="mt-5 grid gap-4">
            <div>
              <h4 className="mt-1 font-display text-2xl font-bold">{data.Name ?? 'Unnamed resume'}</h4>
            </div>
            <div className="grid gap-2 text-sm text-muted">
              <ResumeMeta label="Email" value={data.Email} />
              <ResumeMeta label="Phone" value={data.Phone} />
              <ResumeMeta label="Location" value={data.Location} />
            </div>
            {data.Summary ? <p className="rounded-lg bg-surface-muted p-3 text-sm leading-6 text-muted">{data.Summary}</p> : null}
            {skills.length ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded bg-accent/30 px-2 py-1 text-xs font-semibold text-foreground">
                      {skill}
                    </span>
                  ))}
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

function SettingsPlaceholder({ section }: { section: SettingSection }) {
  const current = settingSections.find((item) => item.id === section)

  return (
    <Card>
      <CardContent className="p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Coming next</p>
          <h2 className="mt-1 font-display text-3xl font-bold">{current?.title ?? 'Settings'}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            This section is reserved for {current?.description.toLowerCase() ?? 'future account controls'}. The settings hub is ready, and this panel can be wired to backend APIs as those controls become available.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function useUploadMutation(
  mutationFn: (file: File) => Promise<{ content?: UserProfile }>,
  successMessage: string,
  refreshProfile: (next?: UserProfile) => void
) {
  return useMutation({
    mutationFn,
    onSuccess: (response) => {
      refreshProfile(response.content)
      toast.success(successMessage)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Upload failed')),
  })
}

function EditorSection({
  title,
  children,
  onAdd,
  onSave,
  saveLabel = 'Save',
  hideActions = false,
}: {
  title: string
  children: React.ReactNode
  onAdd?: () => void
  onSave?: () => void
  saveLabel?: string
  hideActions?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          {!hideActions ? (
            <div className="flex gap-2">
              {onAdd ? (
                <Button variant="secondary" size="sm" onClick={onAdd}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              ) : null}
              {onSave ? (
                <Button size="sm" onClick={onSave}>
                  {saveLabel}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3">{children}</div>
      </CardContent>
    </Card>
  )
}

function Field({
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

function PortfolioFields({ item, onChange }: { item: PortfolioDraft; onChange: (patch: Partial<PortfolioDraft>) => void }) {
  return (
    <>
      <Input value={item.title} placeholder="Project title" onChange={(event) => onChange({ title: event.target.value })} />
      <Textarea value={item.description ?? ''} placeholder="Description" onChange={(event) => onChange({ description: event.target.value })} />
      <Input value={item.image ?? ''} placeholder="Image URL" onChange={(event) => onChange({ image: event.target.value })} />
      <Input value={item.url ?? ''} placeholder="Project URL" onChange={(event) => onChange({ url: event.target.value })} />
    </>
  )
}

function UploadField({ label, icon, onChange }: { label: string; icon: React.ReactNode; onChange: (file: File) => void }) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-semibold hover:border-primary hover:text-primary">
      {icon}
      {label}
      <input
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onChange(file)
          event.target.value = ''
        }}
      />
    </label>
  )
}

function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}

function updateList<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, patch: Partial<T>) {
  setter((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
}

function removeListItem<T>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) {
  setter((items) => items.filter((_, itemIndex) => itemIndex !== index))
}

function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== '' && entry !== undefined && entry !== null)) as T
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function formatSettingsDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
