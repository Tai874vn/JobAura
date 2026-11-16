'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  BriefcaseBusiness,
  Calendar,
  Edit3,
  ExternalLink,
  Globe2,
  ImageUp,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Upload,
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { setCachedSession } from '@/shared/api/session-cache'
import type { Job, UpdateProfile, UserProfile } from '@/shared/schemas'
import { Button, Card, CardContent, CardHeader } from '@/shared/ui'
import { getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { safeExternalUrl } from '@/shared/lib/urls'
import { useSession } from '@/features/auth/use-session'
import {
  hasResumeDraftInput,
  resumeDraftFromData,
  resumeDraftToImportPayload,
  type ResumeDraft,
} from '@/features/users/resume'
import { resumeCareerProblems } from '@/features/users/resume-career'
import { suggestedSkills } from '@/features/users/resume-ai'
import { ConnectionActions } from '@/features/connections/connect-button'
import { useProfileStrength } from './profile-strength'
import { cleanObject } from './profile-form-utils'
import { ProfileEducation, resumeEducation } from './profile/profile-education'
import { allCertificationProblems, certificationDraft, certificationPayload, formatCertificationMonth, isCertificationExpired } from './certifications'
import { useProfileUpload } from './use-profile-upload'
import { InlineEditButton, OwnerUploadButton, ProfileEditDrawer } from './profile/profile-editor'
import {
  ContactRow,
  EmptyState,
  InlineInfo,
  ProfilePostCard,
  ResumeShowcase,
  SectionTitle,
} from './profile/profile-content'
import {
  formatDate,
  getProfileCertifications,
  getProfileSkills,
  humanize,
  sortByOrder,
  type CertificationDraft,
  type MarketplaceProfile,
  type PortfolioItem,
  type ProfileEditPanel,
  type SkillDraft,
} from './profile/model'

export function ProfilePage({ user, posts = [] }: { user: MarketplaceProfile; posts?: Job[] }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user: authUser, isLoading: isSessionLoading } = useSession()
  const isOwner = Boolean(!isSessionLoading && authUser?.id === user.id)
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
  const websiteUrl = safeExternalUrl(profile.website)
  const bio =
    profile.bio ??
    'This JobAura member is building out their profile. Browse their skills, credentials, and portfolio to understand how they can help.'
  // Strength needs the owner's resume, so only the owner sees the badge.
  const completion = useProfileStrength(profile, isOwner).score
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
      setEditableCertifications(certifications.map(certificationDraft))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [profile, skills, certifications])

  function refreshProfile(next?: UserProfile) {
    if (next) {
      queryClient.setQueryData(queryKeys.me, { content: next })
      setCachedSession(next, queryClient)
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
      queryClient.invalidateQueries({ queryKey: queryKeys.myResume })
      setActivePanel(null)
      toast.success('Skills saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save skills')),
  })

  const saveCertifications = useMutation({
    mutationFn: () => {
      const problems = allCertificationProblems(editableCertifications)
      if (problems.length) throw new Error(problems[0])
      return usersApi.replaceCertifications(certificationPayload(editableCertifications))
    },
    onSuccess: (response) => {
      refreshProfile(response.content)
      setActivePanel(null)
      toast.success('Certifications saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save certifications')),
  })

  const uploadAvatar = useProfileUpload(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useProfileUpload(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
  const saveResume = useMutation({
    mutationFn: async () => {
      if (!hasResumeDraftInput(currentResumeDraft)) throw new Error('Fill at least one resume field before saving.')
      const careerProblems = resumeCareerProblems(currentResumeDraft)
      if (careerProblems.length) throw new Error(careerProblems[0])
      const response = await usersApi.importResume(resumeDraftToImportPayload(currentResumeDraft))
      if (attachedResumeFile) return usersApi.uploadResumeFile(attachedResumeFile)
      return response
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.myResume, { content: response.content ?? null })
      queryClient.invalidateQueries({ queryKey: queryKeys.myResume })
      // Resume skills are the profile's skill list.
      queryClient.invalidateQueries({ queryKey: queryKeys.me })
      setAttachedResumeFile(null)
      setResumeDraft({})
      setActivePanel(null)
      toast.success(attachedResumeFile ? 'Resume file and details saved' : 'Resume saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save resume')),
  })

  return (
    <main className="pb-16">
      <div className="container-page pt-8">
        <figure className="group/cover relative m-0 aspect-[21/7] overflow-hidden rounded-lg border border-border bg-surface-muted md:aspect-[21/6]">
          {coverImageUrl ? (
            <Image src={coverImageUrl} alt="" fill priority unoptimized={bypassCoverOptimizer} className="object-cover" sizes="100vw" />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#f6f3f2_0%,#e4e2e1_45%,#bccabe_100%)]">
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(0,109,67,0.16),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-size-[auto,40px_40px,40px_40px]" />
            </div>
          )}
          {isOwner ? (
            <OwnerUploadButton
              className="absolute right-4 top-4 opacity-0 shadow-sm transition group-hover/cover:opacity-100 focus-within:opacity-100"
              label="Edit cover"
              icon={<ImageUp className="h-4 w-4" />}
              loading={uploadCover.isPending}
              onChange={(file) => uploadCover.mutate(file)}
            />
          ) : null}
        </figure>

        <Card className="relative z-10 -mt-14">
          <CardContent className="flex flex-wrap items-start gap-5 p-5 md:p-6">
            <div className="group/avatar relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-primary font-display text-4xl font-bold text-white shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={profile.name} fill unoptimized={bypassAvatarOptimizer} className="object-cover" sizes="112px" />
              ) : (
                initials(profile.name)
              )}
              {isOwner ? (
                <OwnerUploadButton
                  className="absolute inset-0 h-full rounded-full border-0 bg-black/55 text-white opacity-0 transition hover:bg-black/65 group-hover/avatar:opacity-100 focus-within:opacity-100"
                  label="Edit avatar"
                  icon={<Upload className="h-4 w-4" />}
                  loading={uploadAvatar.isPending}
                  onChange={(file) => uploadAvatar.mutate(file)}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">{profile.name}</h1>
                {isOwner && completion === 100 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Complete profile
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-base font-semibold text-foreground md:text-lg">{headline}</p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold text-muted">
                {profile.location ? <InlineInfo icon={<MapPin className="h-3.5 w-3.5" />} value={profile.location} /> : null}
                {websiteUrl ? (
                  <a className="inline-flex items-center gap-1 text-primary hover:underline" href={websiteUrl} target="_blank" rel="noreferrer noopener">
                    <Globe2 className="h-3.5 w-3.5" />
                    {profile.website?.replace(/^https?:\/\//, '')}
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : null}
                {profile.createdAt ? <InlineInfo icon={<Calendar className="h-3.5 w-3.5" />} value={`Member since ${formatDate(profile.createdAt)}`} /> : null}
              </div>
              {skills.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.slice(0, 4).map((skill, index) => (
                    <span key={skill.id ?? `${skill.name}-${index}`} className="rounded-full bg-accent/30 px-2.5 py-1 text-xs font-bold">
                      {skill.name}
                      {skill.level ? <span className="ml-1.5 text-[10.5px] font-medium text-muted">{humanize(skill.level)}</span> : null}
                    </span>
                  ))}
                  {skills.length > 4 ? (
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">+{skills.length - 4} more</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="grid w-full shrink-0 gap-2.5 sm:w-auto sm:min-w-52">
              {isOwner ? (
                <Button className="w-full" onClick={() => setActivePanel('profile')}>
                  <Edit3 className="h-4 w-4" />
                  Edit profile
                </Button>
              ) : (
                <ConnectionActions className="w-full [&>div]:w-full" userId={profile.id} userName={profile.name} />
              )}
              <a href="#services" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-semibold transition hover:border-primary hover:text-primary">
                <ArrowUpRight className="h-4 w-4" />
                View portfolio below
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container-page mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="grid gap-5">
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionTitle title="About" action={isOwner ? <InlineEditButton label="Edit" onClick={() => setActivePanel('profile')} /> : null} />
              <p className="mt-3 max-w-4xl text-sm leading-6 text-muted md:text-base">{bio}</p>
            </CardContent>
          </Card>

          {/* The session profile has no education; the owner's comes straight from their resume. */}
          {profile.role !== 'employer' ? <ProfileEducation education={profile.education ?? resumeEducation(resume?.data)} isOwner={isOwner} /> : null}

          {(isOwner || resume) ? (
            <ResumeShowcase
              resume={resume}
              draft={currentResumeDraft}
              isOwner={isOwner}
              isLoading={resumeQuery.isPending}
              onEdit={() => setActivePanel('resume')}
            />
          ) : null}

          <Card id="services">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle title="Portfolio posts" meta={`${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`} />
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:p-6">
              {posts.length ? (
                posts.map((post) => <ProfilePostCard key={post.id} post={post} user={profile} />)
              ) : (
                <EmptyState icon={<BriefcaseBusiness className="h-5 w-5" />} text="No portfolio posts from this member yet." />
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
                    const projectUrl = safeExternalUrl(item.url)
                    const cardContent = (
                      <>
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
                            {projectUrl ? <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-muted group-hover:text-primary" /> : null}
                          </div>
                          {item.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{item.description}</p> : null}
                        </div>
                      </>
                    )

                    return projectUrl ? (
                      <a
                        key={item.id ?? `${item.title}-${index}`}
                        href={projectUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="group overflow-hidden rounded-lg border border-border bg-surface transition hover:border-primary"
                      >
                        {cardContent}
                      </a>
                    ) : (
                      <div
                        key={item.id ?? `${item.title}-${index}`}
                        className="group overflow-hidden rounded-lg border border-border bg-surface"
                      >
                        {cardContent}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={<BriefcaseBusiness className="h-5 w-5" />} text="Portfolio projects will appear here once this member adds them." />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="grid content-start gap-5">
          <Card>
            <CardContent className="p-5">
              <SectionTitle
                title="Certifications"
                meta={`${certifications.length}`}
                action={isOwner ? <InlineEditButton label="Edit" onClick={() => setActivePanel('certifications')} /> : null}
              />
              {certifications.length ? (
                <div className="mt-4 grid gap-3">
                  {certifications.map((cert, index) => {
                    const credentialUrl = safeExternalUrl(cert.credentialUrl)
                    return (
                    <div key={cert.id ?? `${cert.name}-${index}`} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                          <Award className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold leading-snug">{cert.name}</h3>
                            {cert.category ? <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted">{cert.category}</span> : null}
                            {isCertificationExpired(cert) ? <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[11px] font-semibold text-danger">Expired</span> : null}
                          </div>
                          {cert.issuer ? <p className="mt-0.5 text-sm text-muted">{cert.issuer}</p> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            {cert.issuedAt ? (
                              <InlineInfo icon={<Calendar className="h-3.5 w-3.5" />}
                                value={`Issued ${formatCertificationMonth(cert.issuedAt)}${cert.expiresAt ? ` · ${isCertificationExpired(cert) ? 'Expired' : 'Expires'} ${formatCertificationMonth(cert.expiresAt)}` : ' · No expiration date'}`} />
                            ) : null}
                            {cert.credentialId ? <span>Credential ID {cert.credentialId}</span> : null}
                            {credentialUrl ? (
                              <a href={credentialUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">
                                Show credential <ArrowUpRight className="h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                          {cert.skills?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {cert.skills.map((skill) => <span key={skill} className="rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-semibold">{skill}</span>)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    )
                  })}
                </div>
              ) : (
                <EmptyState icon={<Award className="h-5 w-5" />} text="No certifications added yet." />
              )}
            </CardContent>
          </Card>

          {isOwner ? (
            <Card>
              <CardContent className="p-5">
                <SectionTitle title="Contact" />
                <div className="mt-4 grid gap-2.5">
                  <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={profile.email} />
                  <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile.phone} />
                  <ContactRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={profile.role ?? 'member'} />
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-5 text-muted">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  Only you can see this. Visitors connect with you to exchange contact details.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <SectionTitle title="Contact" />
                <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-5 text-muted">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Contact details are shared privately once you connect with {profile.name.split(' ')[0]}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-muted">
                  <InlineInfo icon={<MapPin className="h-3.5 w-3.5" />} value={profile.location || 'Location private'} />
                  <InlineInfo icon={<Sparkles className="h-3.5 w-3.5" />} value={`${skills.length} skills`} />
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {isOwner ? (
        <ProfileEditDrawer
          foundSkills={suggestedSkills(resume)}
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
          showCertificationProblems={saveCertifications.isError}
          onSaveResume={() => saveResume.mutate()}
        />
      ) : null}
    </main>
  )
}
