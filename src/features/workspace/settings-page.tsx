'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImageUp, Plus, Save, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { ProfileCertification, ProfilePortfolioItem, ProfileSkill, UpdateProfile, UserProfile } from '@/shared/schemas'
import { getErrorMessage, initials } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button, Card, CardContent, Input, Spinner, Textarea } from '@/shared/ui'

type SkillDraft = Omit<ProfileSkill, 'id'>
type CertificationDraft = Omit<ProfileCertification, 'id'>
type PortfolioDraft = Omit<ProfilePortfolioItem, 'id'>

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
  const setUser = useAuthStore((state) => state.setUser)
  const profileQuery = useQuery({ queryKey: queryKeys.myProfile, queryFn: usersApi.myProfile })
  const profile = profileQuery.data?.content

  const [basic, setBasic] = useState<UpdateProfile>({})
  const [skills, setSkills] = useState<SkillDraft[]>([])
  const [certifications, setCertifications] = useState<CertificationDraft[]>([])
  const [portfolio, setPortfolio] = useState<ProfilePortfolioItem[]>([])
  const [newPortfolio, setNewPortfolio] = useState<PortfolioDraft>(emptyPortfolio)

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

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold">Profile settings</h1>
          <p className="mt-1 text-sm text-muted">Update your public marketplace profile.</p>
        </div>
        <Button disabled={isSaving} onClick={() => saveBasic.mutate()}>
          <Save className="h-4 w-4" />
          Save profile
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
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
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-primary font-display text-xl font-bold text-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : initials(profile.name)}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">{profile.name}</h2>
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
