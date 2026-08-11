'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  ExternalLink,
  FileJson,
  FileText,
  Globe2,
  ImageUp,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { Job, UpdateProfile, User, UserProfile, UserResume } from '@/shared/schemas'
import { Badge, Button, ButtonLink, Card, CardContent, CardHeader, Input, Textarea } from '@/shared/ui'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { currency, getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import {
  hasResumeDraftInput,
  resumeDraftFromData,
  resumeDraftToImportPayload,
  resumeFileAccept,
  resumeSkills,
  type ResumeDraft,
  type ResumeFieldKey,
} from '@/features/users/resume'
import { ConnectionActions } from '@/features/connections/connect-button'

type ProfileSkill = {
  id?: number
  name: string
  level?: string | null
  sortOrder?: number | null
}

type Certification = {
  id?: number
  name: string
  issuer?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
  credentialUrl?: string | null
  credentialId?: string | null
  sortOrder?: number | null
}

type PortfolioItem = {
  id?: number
  title: string
  description?: string | null
  image?: string | null
  url?: string | null
  sortOrder?: number | null
}

type SkillDraft = Omit<ProfileSkill, 'id'>
type CertificationDraft = Omit<Certification, 'id'>
type ProfileEditPanel = 'profile' | 'skills' | 'certifications' | 'resume' | null

type MarketplaceProfile = User & {
  headline?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  cover?: string | null
  coverImage?: string | null
  skills?: ProfileSkill[] | null
  profileSkills?: ProfileSkill[] | null
  certifications?: Certification[] | null
  profileCertifications?: Certification[] | null
  portfolio?: PortfolioItem[] | null
  portfolioItems?: PortfolioItem[] | null
}

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

export function ProfilePage({ user, posts = [] }: { user: MarketplaceProfile; posts?: Job[] }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const authUser = useAuthStore((state) => state.user)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  const setUser = useAuthStore((state) => state.setUser)
  const isOwner = Boolean(hasHydrated && authUser?.id === user.id)
  const profile: MarketplaceProfile | UserProfile = (isOwner ? authUser : null) ?? user
  const skills = useMemo(() => getProfileSkills(profile), [profile])
  const certifications = useMemo(() => getProfileCertifications(profile), [profile])
  const portfolio = useMemo<PortfolioItem[]>(() => sortByOrder(profile.portfolio ?? profile.portfolioItems ?? []), [profile])
  const coverImage = profile.coverImage ?? profile.cover
  const coverImageUrl = resolveAssetUrl(coverImage)
  const bypassCoverOptimizer = shouldBypassImageOptimizer(coverImage)
  const avatarUrl = resolveAssetUrl(profile.avatar)
  const bypassAvatarOptimizer = shouldBypassImageOptimizer(profile.avatar)
  const headline = profile.headline ?? 'Independent professional on JobAura'
  const bio =
    profile.bio ??
    'This JobAura member is building out their profile. Browse their skills, credentials, and portfolio to understand how they can help.'
  const [editableProfile, setEditableProfile] = useState<UpdateProfile>({})
  const [editableSkills, setEditableSkills] = useState<SkillDraft[]>([])
  const [editableCertifications, setEditableCertifications] = useState<CertificationDraft[]>([])
  const [resumeDraft, setResumeDraft] = useState<Partial<ResumeDraft>>({})
  const [activePanel, setActivePanel] = useState<ProfileEditPanel>(null)
  const [attachedResumeFile, setAttachedResumeFile] = useState<File | null>(null)

  const resumeQuery = useQuery({
    queryKey: queryKeys.myResume,
    queryFn: usersApi.myResume,
    enabled: isOwner,
  })
  const resume = resumeQuery.data?.content ?? null
  const currentResumeDraft = { ...resumeDraftFromData(resume?.data), ...resumeDraft }



  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEditableProfile({
        name: profile.name ?? '',
        phone: profile.phone ?? '',
        birthDay: profile.birthDay ?? '',
        gender: profile.gender ?? '',
        headline: profile.headline ?? '',
        bio: profile.bio ?? '',
        location: profile.location ?? '',
        website: profile.website ?? '',
      })
      setEditableSkills(skills.map((skill, index) => ({ name: skill.name, level: skill.level ?? '', sortOrder: skill.sortOrder ?? index })))
      setEditableCertifications(
        certifications.map((cert, index) => ({
          name: cert.name,
          issuer: cert.issuer ?? '',
          issuedAt: toDateInput(cert.issuedAt),
          expiresAt: toDateInput(cert.expiresAt),
          credentialUrl: cert.credentialUrl ?? '',
          credentialId: cert.credentialId ?? '',
          sortOrder: cert.sortOrder ?? index,
        }))
      )
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile, skills, certifications])

  function refreshProfile(next?: UserProfile) {
    if (next) {
      queryClient.setQueryData(queryKeys.me, { content: next })
      setUser(next)
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.me })
    router.refresh()
  }

  const saveProfile = useMutation({
    mutationFn: () => usersApi.updateMyProfile(cleanObject(editableProfile)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      setActivePanel(null)
      toast.success('Profile updated')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to update profile')),
  })

  const saveSkills = useMutation({
    mutationFn: () =>
      usersApi.replaceSkills(editableSkills.map((skill, index) => cleanObject({ ...skill, sortOrder: index })).filter((skill) => skill.name)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      setActivePanel(null)
      toast.success('Skills saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save skills')),
  })

  const saveCertifications = useMutation({
    mutationFn: () =>
      usersApi.replaceCertifications(
        editableCertifications.map((cert, index) => cleanObject({ ...cert, sortOrder: index })).filter((cert) => cert.name)
      ),
    onSuccess: (response) => {
      refreshProfile(response.content)
      setActivePanel(null)
      toast.success('Certifications saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save certifications')),
  })

  const uploadAvatar = useUploadMutation(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useUploadMutation(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
  const saveResume = useMutation({
    mutationFn: async () => {
      if (!hasResumeDraftInput(currentResumeDraft)) throw new Error('Fill at least one resume field before saving.')
      const response = await usersApi.importResume(resumeDraftToImportPayload(currentResumeDraft))
      if (attachedResumeFile) return usersApi.uploadResumeFile(attachedResumeFile)
      return response
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.myResume, { content: response.content ?? null })
      queryClient.invalidateQueries({ queryKey: queryKeys.myResume })
      setAttachedResumeFile(null)
      setResumeDraft({})
      setActivePanel(null)
      toast.success(attachedResumeFile ? 'Resume file and details saved' : 'Resume saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save resume')),
  })

  return (
    <main className="bg-background pb-12">
      <section className="border-b border-border bg-surface">
        <div className="container-page">
          <div className="group/cover relative h-48 overflow-hidden rounded-b-lg border-x border-b border-border bg-[#e4e2e1] md:h-64">
            {coverImageUrl ? (
              <Image src={coverImageUrl} alt="" fill priority unoptimized={bypassCoverOptimizer} className="object-cover" sizes="100vw" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#f6f3f2_0%,#e4e2e1_45%,#bccabe_100%)]">
                <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(0,109,67,0.16),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-size-[auto,40px_40px,40px_40px]" />
              </div>
            )}
            {isOwner ? (
              <OwnerUploadButton
                className="absolute right-4 top-4 opacity-0 shadow-sm transition group-hover/cover:opacity-100 focus-within:opacity-100"
                label="Edit cover"
                icon={<ImageUp className="h-4 w-4" />}
                disabled={uploadCover.isPending}
                onChange={(file) => uploadCover.mutate(file)}
              />
            ) : null}
          </div>

          <div className="relative -mt-14 grid gap-5 pb-6 lg:grid-cols-[1fr_336px]">
            <Card className="overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-end">
                  <div className="group/avatar relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-white bg-primary font-display text-4xl font-bold text-white shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={profile.name} fill unoptimized={bypassAvatarOptimizer} className="object-cover" sizes="112px" />
                    ) : (
                      initials(profile.name)
                    )}
                    {isOwner ? (
                      <OwnerUploadButton
                        className="absolute inset-0 h-full rounded-none border-0 bg-black/55 text-white opacity-0 transition hover:bg-black/65 group-hover/avatar:opacity-100 focus-within:opacity-100"
                        label="Edit avatar"
                        icon={<Upload className="h-4 w-4" />}
                        disabled={uploadAvatar.isPending}
                        onChange={(file) => uploadAvatar.mutate(file)}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{profile.name}</h1>
                      <Badge tone="primary" className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified profile
                      </Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-lg font-semibold text-foreground">{headline}</p>
                    {isOwner ? (
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:border-primary hover:text-primary"
                        onClick={() => setActivePanel('profile')}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit profile
                      </button>
                    ) : null}
                    {!isOwner ? <ConnectionActions className="mt-3" userId={profile.id} userName={profile.name} /> : null}
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                      {profile.location ? <InlineInfo icon={<MapPin className="h-4 w-4" />} value={profile.location} /> : null}
                      {profile.website ? (
                        <a className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" href={profile.website}>
                          <Globe2 className="h-4 w-4" />
                          Website
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <InlineInfo icon={<Sparkles className="h-4 w-4" />} value={`${skills.length} skills listed`} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="self-end">
              <CardContent className="grid gap-3 p-4 text-sm">
                <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
                <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone} />
                <ContactRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={profile.role ?? 'member'} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="container-page mt-6 grid gap-6 lg:grid-cols-[1fr_336px]">
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionTitle title="About" action={isOwner ? <InlineEditButton label="Edit" onClick={() => setActivePanel('profile')} /> : null} />
              <p className="mt-3 max-w-4xl text-sm leading-6 text-muted md:text-base">{bio}</p>
            </CardContent>
          </Card>

          {(isOwner || resume) ? (
            <ResumeShowcase
              resume={resume}
              draft={currentResumeDraft}
              isOwner={isOwner}
              isLoading={resumeQuery.isPending}
              onEdit={() => setActivePanel('resume')}
            />
          ) : null}

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle title="Posts" meta={`${posts.length} services`} />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Public marketplace activity</span>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:p-6">
              {posts.length ? (
                posts.map((post) => <ProfilePostCard key={post.id} post={post} user={profile} />)
              ) : (
                <EmptyState icon={<BriefcaseBusiness className="h-5 w-5" />} text="No service posts from this member yet." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionTitle title="Portfolio" meta={`${portfolio.length} projects`} />
              {portfolio.length ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {portfolio.map((item, index) => {
                    const imageUrl = resolveAssetUrl(item.image)
                    const bypassImageOptimizer = shouldBypassImageOptimizer(item.image)

                    return (
                      <a
                        key={item.id ?? `${item.title}-${index}`}
                        href={item.url ?? '#'}
                        className="group overflow-hidden rounded-lg border border-border bg-white transition hover:border-primary"
                      >
                        <div className="relative aspect-video bg-surface-muted">
                          {imageUrl ? (
                            <Image src={imageUrl} alt="" fill unoptimized={bypassImageOptimizer} className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-primary">
                              <BriefcaseBusiness className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-display text-lg font-bold leading-snug">{item.title}</h3>
                            {item.url ? <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted group-hover:text-primary" /> : null}
                          </div>
                          {item.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.description}</p> : null}
                        </div>
                      </a>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={<BriefcaseBusiness className="h-5 w-5" />} text="Portfolio projects will appear here once this member adds them." />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-6">
          <Card>
            <CardContent className="p-5">
              <SectionTitle
                title="Skills"
                meta={`${skills.length}`}
                action={isOwner ? <InlineEditButton label="Edit" onClick={() => setActivePanel('skills')} /> : null}
              />
              {skills.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span key={skill.id ?? `${skill.name}-${index}`} className="rounded bg-accent/30 px-3 py-2 text-sm font-semibold text-foreground">
                      {skill.name}
                      {skill.level ? <span className="ml-2 text-xs font-medium text-muted">{humanize(skill.level)}</span> : null}
                    </span>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Star className="h-5 w-5" />} text="No skills added yet." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionTitle
                title="Certifications"
                meta={`${certifications.length}`}
                action={isOwner ? <InlineEditButton label="Edit" onClick={() => setActivePanel('certifications')} /> : null}
              />
              {certifications.length ? (
                <div className="mt-4 grid gap-3">
                  {certifications.map((cert, index) => (
                    <div key={cert.id ?? `${cert.name}-${index}`} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                          <Award className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-snug">{cert.name}</h3>
                          {cert.issuer ? <p className="mt-0.5 text-sm text-muted">{cert.issuer}</p> : null}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                            {cert.issuedAt ? <InlineInfo icon={<Calendar className="h-3.5 w-3.5" />} value={formatDate(cert.issuedAt)} /> : null}
                            {cert.credentialUrl ? (
                              <a href={cert.credentialUrl} className="font-semibold text-primary hover:underline">
                                Credential
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Award className="h-5 w-5" />} text="No certifications added yet." />
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      {isOwner ? (
        <ProfileEditDrawer
          activePanel={activePanel}
          profile={editableProfile}
          skills={editableSkills}
          certifications={editableCertifications}
          resume={resume}
          resumeDraft={currentResumeDraft}
          attachedResumeFile={attachedResumeFile}
          isSaving={saveProfile.isPending || saveSkills.isPending || saveCertifications.isPending || saveResume.isPending}
          onClose={() => setActivePanel(null)}
          onProfileChange={(patch) => setEditableProfile((state) => ({ ...state, ...patch }))}
          onSkillsChange={setEditableSkills}
          onCertificationsChange={setEditableCertifications}
          onResumeFieldChange={(field, value) => setResumeDraft((draft) => ({ ...draft, [field]: value }))}
          onResumeFileChange={setAttachedResumeFile}
          onResumeFileClear={() => setAttachedResumeFile(null)}
          onSaveProfile={() => saveProfile.mutate()}
          onSaveSkills={() => saveSkills.mutate()}
          onSaveCertifications={() => saveCertifications.mutate()}
          onSaveResume={() => saveResume.mutate()}
        />
      ) : null}
    </main>
  )
}

function ProfilePostCard({ post, user }: { post: Job; user: MarketplaceProfile | UserProfile }) {
  const imageUrl = resolveAssetUrl(post.hinhAnh)
  const bypassOptimizer = shouldBypassImageOptimizer(post.hinhAnh)

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{user.name}</span>
            <span className="block text-xs text-muted">{post.createdAt ? formatDate(post.createdAt) : 'Marketplace service'}</span>
          </span>
        </div>
        <Badge tone="rating">
          <Star className="mr-1 h-3 w-3 fill-rating text-rating" />
          {(post.saoCongViec ?? 0).toFixed(1)}
        </Badge>
      </div>
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <Link href={`/jobs/${post.id}`} className="relative block aspect-16/10 bg-surface-muted md:aspect-auto">
          {imageUrl ? (
            <Image src={imageUrl} alt={post.tenCongViec} fill unoptimized={bypassOptimizer} className="object-cover" sizes="(min-width: 768px) 220px, 100vw" />
          ) : (
            <span className="flex h-full items-center justify-center text-primary">
              <BriefcaseBusiness className="h-8 w-8" />
            </span>
          )}
        </Link>
        <div className="grid gap-4 p-4">
          <div>
            <Link href={`/jobs/${post.id}`} className="font-display text-xl font-bold leading-snug hover:text-primary">
              {post.tenCongViec}
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
              {post.moTaNgan || post.moTa || 'This service post is available on JobAura.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted">
              From <strong className="text-foreground">{currency(post.giaTien)}</strong>
            </span>
            <div className="flex gap-2">
              <ButtonLink href={`/jobs/${post.id}`} variant="secondary" size="sm">
                View details
              </ButtonLink>
              <Button size="sm">Contact</Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function ResumeShowcase({
  resume,
  draft,
  isOwner,
  isLoading,
  onEdit,
}: {
  resume: UserResume | null
  draft: ResumeDraft
  isOwner: boolean
  isLoading: boolean
  onEdit: () => void
}) {
  const skills = resumeSkills(draft.Skills)
  const fileUrl = resolveAssetUrl(resume?.sourceFileUrl)

  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <SectionTitle
          title="CV / Resume"
          meta={resume?.updatedAt ? `Updated ${formatFullDate(resume.updatedAt)}` : undefined}
          action={isOwner ? <InlineEditButton label={resume ? 'Edit' : 'Add'} onClick={onEdit} /> : null}
        />

        {isLoading ? (
          <p className="mt-4 text-sm text-muted">Loading resume...</p>
        ) : hasResumeDraftInput(draft) ? (
          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_240px]">
            <div className="grid gap-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold">{draft.Name || 'Resume profile'}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                      {draft.Email ? <InlineInfo icon={<Mail className="h-4 w-4" />} value={draft.Email} /> : null}
                      {draft.Phone ? <InlineInfo icon={<Phone className="h-4 w-4" />} value={draft.Phone} /> : null}
                      {draft.Location ? <InlineInfo icon={<MapPin className="h-4 w-4" />} value={draft.Location} /> : null}
                      {draft.Role ? <InlineInfo icon={<BriefcaseBusiness className="h-4 w-4" />} value={draft.Role} /> : null}
                      {draft.Industry ? <InlineInfo icon={<Building2 className="h-4 w-4" />} value={draft.Industry} /> : null}
                      {draft.YearsExperience ? <InlineInfo icon={<Clock3 className="h-4 w-4" />} value={`${draft.YearsExperience} years`} /> : null}
                    </div>
                  </div>
                  {fileUrl ? (
                    <a
                      href={fileUrl}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:border-primary hover:text-primary"
                    >
                      <Download className="h-4 w-4" />
                      File
                    </a>
                  ) : null}
                </div>
                {draft.Summary ? <p className="mt-4 text-sm leading-6 text-muted">{draft.Summary}</p> : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <ResumeSnippet title="Experience" value={draft.Experience} />
                <ResumeSnippet title="Education" value={draft.Education} />
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold">Resume data</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {resume?.sourceFileName ? resume.sourceFileName : resume ? 'Structured resume saved' : 'No source file attached'}
              </p>
              {skills.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.slice(0, 10).map((skill) => (
                    <span key={skill} className="rounded bg-accent/40 px-2 py-1 text-xs font-semibold text-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : null}
            </aside>
          </div>
        ) : (
          <EmptyState icon={<FileText className="h-5 w-5" />} text={isOwner ? 'Add your CV details directly from this profile page.' : 'No CV details are public yet.'} />
        )}
      </CardContent>
    </Card>
  )
}

function ProfileEditDrawer({
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
  onSkillsChange: React.Dispatch<React.SetStateAction<SkillDraft[]>>
  onCertificationsChange: React.Dispatch<React.SetStateAction<CertificationDraft[]>>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/24 p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
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

function InlineEditButton({ label, onClick }: { label: string; onClick: () => void }) {
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

function OwnerUploadButton({
  label,
  icon,
  className,
  disabled,
  onChange,
}: {
  label: string
  icon: React.ReactNode
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

function ResumeSnippet({ title, value }: { title: string; value?: string | null }) {
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

function EditListShell({ children, onAdd }: { children: React.ReactNode; onAdd: () => void }) {
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

function SectionTitle({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="flex items-center gap-2">
        {meta ? <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{meta}</span> : null}
        {action}
      </div>
    </div>
  )
}

function InlineInfo({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {value}
    </span>
  )
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
        <span className="block truncate font-semibold">{value || '-'}</span>
      </span>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm text-muted">
      <span className="text-primary">{icon}</span>
      {text}
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

function getProfileSkills(profile: MarketplaceProfile | UserProfile): ProfileSkill[] {
  return sortByOrder(profile.profileSkills ?? profile.skills ?? legacySkills(profile.skill))
}

function getProfileCertifications(profile: MarketplaceProfile | UserProfile): Certification[] {
  return sortByOrder(profile.profileCertifications ?? profile.certifications ?? legacyCertifications(profile.certification))
}
function legacySkills(value?: string | null): ProfileSkill[] {
  if (!value) return []
  return value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, sortOrder) => ({ name, sortOrder }))
}

function legacyCertifications(value?: string | null): Certification[] {
  if (!value) return []
  return value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, sortOrder) => ({ name, sortOrder }))
}

function sortByOrder<T extends { sortOrder?: number | null }>(items: T[]) {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date)
}

function formatFullDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ')
}
