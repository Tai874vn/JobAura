'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ImageUp, Save, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { setCachedSession } from '@/shared/api/session-cache'
import type { ProfileCertification, ProfilePortfolioItem, ProfileSkill, UpdateProfile, UserProfile } from '@/shared/schemas'
import { getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { Button, Card, CardContent, ConfirmationDialog, Input, Spinner, Textarea } from '@/shared/ui'
import { calculateProfileCompletion } from '@/features/users/profile-posts'
import { cleanObject, removeListItem, toDateInput, updateList } from '@/features/users/profile-form-utils'
import { useProfileUpload } from '@/features/users/use-profile-upload'
import {
  canExtractResumeFile,
  extractResumeFile,
  hasResumeDraftInput,
  resumeDraftFromData,
  resumeDraftToImportPayload,
  validateResumeFile,
  type ResumeDraft,
  type ResumeFieldKey,
} from '@/features/users/resume'
import { ResumeSettingsSection } from './resume-settings-section'
import { useSession } from '@/features/auth/use-session'
import { isSettingSection, settingSections, SettingsOverview, SettingsPlaceholder, type SettingSection } from './settings/setting-sections'
import { EditorSection, Field, IconButton, PortfolioFields, UploadField, type PortfolioDraft } from './settings/settings-form-controls'

type SkillDraft = Omit<ProfileSkill, 'id'>
type CertificationDraft = Omit<ProfileCertification, 'id'>

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


export function SettingsPage() {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: profile, isLoading: isProfileLoading } = useSession()
  const resumeQuery = useQuery({ queryKey: queryKeys.myResume, queryFn: usersApi.myResume, enabled: Boolean(profile) })
  const resume = resumeQuery.data?.content ?? null

  const requestedSection = searchParams.get('section')
  const activeSection = isSettingSection(requestedSection) ? requestedSection : 'overview'
  const [basic, setBasic] = useState<UpdateProfile>({})
  const [skills, setSkills] = useState<SkillDraft[]>([])
  const [certifications, setCertifications] = useState<CertificationDraft[]>([])
  const [portfolio, setPortfolio] = useState<ProfilePortfolioItem[]>([])
  const [newPortfolio, setNewPortfolio] = useState<PortfolioDraft>(emptyPortfolio)
  const [resumeDraft, setResumeDraft] = useState<Partial<ResumeDraft>>({})
  const [attachedResumeFile, setAttachedResumeFile] = useState<File | null>(null)
  const [pendingPortfolioDelete, setPendingPortfolioDelete] = useState<ProfilePortfolioItem | null>(null)

  function selectSection(section: SettingSection) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', section)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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
      setSkills(getProfileSkills(profile).map(({ name, level, sortOrder }, index) => ({ name, level: level ?? '', sortOrder: sortOrder ?? index })))
      setCertifications(
        getProfileCertifications(profile).map((item, index) => ({
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
      setCachedSession(next, queryClient)
    }
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
      setPendingPortfolioDelete(null)
      toast.success('Portfolio item deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete portfolio item')),
  })

  const uploadAvatar = useProfileUpload(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useProfileUpload(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
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
  const predictResumeSeniority = useMutation({
    mutationFn: usersApi.predictResumeSeniority,
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.myResume, { ...resumeQuery.data, content: response.content ?? null })
      queryClient.invalidateQueries({ queryKey: queryKeys.myResume })
      toast.success('Resume seniority predicted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to predict resume seniority')),
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

  if (isProfileLoading) {
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
                  onClick={() => selectSection(section.id)}
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
            <SettingsOverview profile={profile} completion={completion} resume={resume} onSelect={selectSection} />
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
                          <Button variant="danger" size="sm" disabled={!item.id} onClick={() => setPendingPortfolioDelete(item)}>
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
            <ResumeSettingsSection
              resume={resume}
              draft={currentResumeDraft}
              attachedFile={attachedResumeFile}
              isLoading={resumeQuery.isPending}
              isImporting={saveResume.isPending}
              isPredicting={predictResumeSeniority.isPending}
              onFieldChange={updateResumeField}
              onClearAttachedFile={() => setAttachedResumeFile(null)}
              onImport={submitResumeImport}
              onPredictSeniority={() => predictResumeSeniority.mutate()}
              onResumeFile={loadResumeFile}
            />
          ) : null}

          {activeSection !== 'overview' && activeSection !== 'profile' && activeSection !== 'resume' ? <SettingsPlaceholder section={activeSection} /> : null}
        </main>
      </div>
      <ConfirmationDialog
        open={Boolean(pendingPortfolioDelete)}
        title="Delete this portfolio item?"
        description={`“${pendingPortfolioDelete?.title ?? ''}” will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete portfolio item"
        pending={deletePortfolio.isPending}
        onCancel={() => setPendingPortfolioDelete(null)}
        onConfirm={() => {
          if (pendingPortfolioDelete?.id) deletePortfolio.mutate(pendingPortfolioDelete.id)
        }}
      />
    </div>
  )
}

function getProfileSkills(profile: UserProfile): ProfileSkill[] {
  return profile.profileSkills ?? profile.skills ?? []
}

function getProfileCertifications(profile: UserProfile): ProfileCertification[] {
  return profile.profileCertifications ?? profile.certifications ?? []
}
