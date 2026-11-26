'use client'


import { useMemo } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Award, BadgeCheck, BriefcaseBusiness, Calendar, Edit3, ExternalLink, Globe2, ImageUp, Lock, Mail, MapPin, Phone, ShieldCheck, Tags, Upload, GraduationCap } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { usersApi } from '@/shared/api/endpoints'
import { reportNonFatalError } from '@/shared/api/query-client'
import { queryKeys } from '@/shared/api/query-keys'
import { setCachedSession } from '@/shared/api/session-cache'
import type { Job, UserProfile } from '@/shared/schemas'
import { Button, Card, CardContent, CardHeader } from '@/shared/ui'
import { initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { safeExternalUrl } from '@/shared/lib/urls'
import { useSession } from '@/features/auth/hooks/use-session'
import { resumeDraftFromData } from '@/features/users/utils/resume'
import { useOwnResume } from '@/features/users/hooks/use-own-resume'
import { ConnectionActions } from '@/features/connections/components/connect-button'
import { useProfileStrength } from '../../utils/profile-strength'
import { formatCertificationMonth, isCertificationExpired } from '../../utils/certifications'
import { useProfileUpload } from '../../hooks/use-profile-upload'
import { refreshMyProfilePage } from '../../utils/refresh-profile-page'
import { InlineEditButton, OwnerUploadButton } from './profile-editor'
import { ContactRow, EmptyState, InlineInfo, ProfilePostCard, ResumeShowcase, SectionTitle } from './profile-content'
import { formatDate, getProfileCertifications, getProfileSkills, humanize, sortByOrder, type MarketplaceProfile, type PortfolioItem } from '../../utils/profile/model'
import Link from 'next/link'
import { skillsApi } from '@/shared/api/endpoints/users'

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
  // Only your own profile shows your resume (see useOwnResume for why the check matters).
  const { resume, isPending: isResumePending } = useOwnResume(isOwner)
  const currentResumeDraft = resumeDraftFromData(resume?.data)
  // Editing happens in Settings (one form per thing); the profile page links to the field.
  const editIn = (href: string) => router.push(href)



  function refreshProfile(next?: UserProfile) {
    if (next) {
      queryClient.setQueryData(queryKeys.me, { content: next })
      setCachedSession(next, queryClient)
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.me })
    void refreshMyProfilePage().catch((error) => reportNonFatalError(error, 'cache:revalidate-profile'))
    router.refresh()
  }

  const uploadAvatar = useProfileUpload(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useProfileUpload(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
  return (
    <div className="pb-16">
      <div className="container-page pt-8">
        <figure className="group/cover relative m-0 aspect-[21/7] overflow-hidden rounded-lg border border-border bg-surface-muted md:aspect-[21/6]">
          {coverImageUrl ? (
            <Image src={coverImageUrl} alt="" fill priority unoptimized={bypassCoverOptimizer} className="object-cover" sizes="100vw" />
          ) : (
            <div aria-hidden="true" className="absolute inset-0 bg-surface-muted" />
          )}
          {isOwner ? (
            <OwnerUploadButton
              className="absolute right-4 top-4 opacity-100 shadow-sm transition sm:opacity-0 sm:group-hover/cover:opacity-100 sm:focus-within:opacity-100"
              label="Edit cover"
              icon={<ImageUp className="h-4 w-4" />}
              loading={uploadCover.isPending}
              onChange={(file) => uploadCover.mutate(file)}
            />
          ) : null}
        </figure>

        <Card className="relative z-10 -mt-14">
          <CardContent className="flex flex-wrap items-start gap-5 p-5 md:p-6">
            <div className="group/avatar relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-primary font-display text-4xl font-medium text-white shadow-float">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={profile.name} fill unoptimized={bypassAvatarOptimizer} className="object-cover" sizes="112px" />
              ) : (
                initials(profile.name)
              )}
              {isOwner ? (
                <OwnerUploadButton
                  className="absolute inset-0 h-full rounded-full border-0 bg-black/55 text-white opacity-100 transition hover:bg-black/65 sm:opacity-0 sm:group-hover/avatar:opacity-100 sm:focus-within:opacity-100"
                  label="Edit avatar"
                  icon={<Upload className="h-4 w-4" />}
                  loading={uploadAvatar.isPending}
                  onChange={(file) => uploadAvatar.mutate(file)}
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl font-medium leading-tight tracking-tight">{profile.name}</h1>
                {isOwner && completion === 100 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Complete profile
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-base font-medium text-foreground md:text-lg">{headline}</p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-medium text-muted">
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
                    <span key={skill.id ?? `${skill.name}-${index}`} className="rounded-full bg-accent/30 px-2.5 py-1 text-xs font-medium">
                      {skill.name}
                      {skill.level ? <span className="ml-1.5 text-xs font-medium text-muted">{humanize(skill.level)}</span> : null}
                    </span>
                  ))}
                  {skills.length > 4 ? (
                    <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">+{skills.length - 4} more</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="grid w-full shrink-0 gap-2.5 sm:w-auto sm:min-w-52">
              {isOwner ? (
                <Button className="w-full" onClick={() => editIn('/settings?section=profile')}>
                  <Edit3 className="h-4 w-4" />
                  Edit profile
                </Button>
              ) : (
                <ConnectionActions className="w-full [&>div]:w-full" userId={profile.id} userName={profile.name} />
              )}
              <a href="#services" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium transition hover:border-primary hover:text-primary">
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
              <SectionTitle title="About" action={isOwner ? <InlineEditButton label="Edit" onClick={() => editIn('/settings?section=profile&focus=bio')} /> : null} />
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
              isLoading={isResumePending}
              onEdit={() => editIn('/settings?section=resume')}
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
                            <h3 className="font-display text-lg font-medium leading-snug">{item.title}</h3>
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
                action={isOwner ? <InlineEditButton label="Edit" onClick={() => editIn('/settings?section=profile&focus=certifications')} /> : null}
              />
              {certifications.length ? (
                <div className="mt-4 grid gap-3">
                  {certifications.map((cert, index) => {
                    const credentialUrl = safeExternalUrl(cert.credentialUrl)
                    return (
                    <div key={cert.id ?? `${cert.name}-${index}`} className="rounded-lg border border-border bg-surface p-3">
                      <div className="flex gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-muted text-muted">
                          <Award className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium leading-snug">{cert.name}</h3>
                            {cert.category ? <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs font-medium text-muted">{cert.category}</span> : null}
                            {isCertificationExpired(cert) ? <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger">Expired</span> : null}
                          </div>
                          {cert.issuer ? <p className="mt-0.5 text-sm text-muted">{cert.issuer}</p> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                            {cert.issuedAt ? (
                              <InlineInfo icon={<Calendar className="h-3.5 w-3.5" />}
                                value={`Issued ${formatCertificationMonth(cert.issuedAt)}${cert.expiresAt ? ` · ${isCertificationExpired(cert) ? 'Expired' : 'Expires'} ${formatCertificationMonth(cert.expiresAt)}` : ' · No expiration date'}`} />
                            ) : null}
                            {cert.credentialId ? <span>Credential ID {cert.credentialId}</span> : null}
                            {credentialUrl ? (
                              <a href={credentialUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline">
                                Show credential <ArrowUpRight className="h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                          {cert.skills?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {cert.skills.map((skill) => <span key={skill} className="rounded-full bg-accent/30 px-2 py-0.5 text-xs font-medium">{skill}</span>)}
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
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  Only you can see this. Visitors connect with you to exchange contact details.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <SectionTitle title="Contact" />
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Contact details are shared privately once you connect with {profile.name.split(' ')[0]}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted">
                  <InlineInfo icon={<MapPin className="h-3.5 w-3.5" />} value={profile.location || 'Location private'} />
                  <InlineInfo icon={<Tags className="h-3.5 w-3.5" />} value={`${skills.length} skills`} />
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

/** The degree and field-of-study code a profile shows from resume data; null without a stated degree. */
export function resumeEducation(data?: { Degree?: string | null; FieldOfStudy?: string | null } | null) {
  const degree = data?.Degree?.trim()
  if (!degree || degree === 'Not stated') return null
  const code = data?.FieldOfStudy?.trim() ?? ''
  return { degree, fieldOfStudy: /^\d{4}$/.test(code) ? code : null }
}

/** Education comes from the resume (one copy), so the owner edits it there. */
export function ProfileEducation({ education, isOwner }: {
  education?: { degree: string; fieldOfStudy: string | null } | null
  isOwner: boolean
}) {
  const fields = useQuery({ queryKey: ['fields-of-study'], queryFn: skillsApi.fieldsOfStudy, staleTime: Infinity, gcTime: 30 * 60_000, enabled: Boolean(education?.fieldOfStudy) })
  if (!education && !isOwner) return null
  const fieldName = fields.data?.content?.find((field) => field.code === education?.fieldOfStudy)?.name
  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <SectionTitle title="Education" action={isOwner ? (
          <Link href="/settings?section=resume&focus=education" className="text-sm font-medium text-primary hover:underline">
            {education ? 'Edit in resume' : 'Add in resume'}
          </Link>
        ) : null} />
        {education ? (
          <div className="mt-4 flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-surface-muted text-muted">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-medium leading-snug">{education.degree}</h3>
              {education.fieldOfStudy ? <p className="mt-0.5 text-sm text-muted">{fieldName ?? 'Field of study'}</p> : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Add your highest degree and field of study in your resume.</p>
        )}
      </CardContent>
    </Card>
  )
}
