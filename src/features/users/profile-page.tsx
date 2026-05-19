import {
  ArrowUpRight,
  Award,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Job, User } from '@/shared/schemas'
import { Badge, Button, Card, CardContent, CardHeader } from '@/shared/ui'
import { currency, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'

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

type MarketplaceProfile = User & {
  headline?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  cover?: string | null
  coverImage?: string | null
  skills?: ProfileSkill[] | null
  certifications?: Certification[] | null
  portfolio?: PortfolioItem[] | null
  portfolioItems?: PortfolioItem[] | null
}

export function ProfilePage({ user, posts = [] }: { user: MarketplaceProfile; posts?: Job[] }) {
  const skills = sortByOrder(user.skills ?? legacySkills(user.skill))
  const certifications = sortByOrder(user.certifications ?? legacyCertifications(user.certification))
  const portfolio = sortByOrder(user.portfolio ?? user.portfolioItems ?? [])
  const coverImage = user.coverImage ?? user.cover
  const coverImageUrl = resolveAssetUrl(coverImage)
  const bypassCoverOptimizer = shouldBypassImageOptimizer(coverImage)
  const avatarUrl = resolveAssetUrl(user.avatar)
  const bypassAvatarOptimizer = shouldBypassImageOptimizer(user.avatar)
  const headline = user.headline ?? 'Independent professional on JobAura'
  const bio =
    user.bio ??
    'This JobAura member is building out their profile. Browse their skills, credentials, and portfolio to understand how they can help.'

  return (
    <main className="bg-background pb-12">
      <section className="border-b border-border bg-surface">
        <div className="container-page">
          <div className="relative h-48 overflow-hidden rounded-b-lg border-x border-b border-border bg-[#e4e2e1] md:h-64">
            {coverImageUrl ? (
              <Image src={coverImageUrl} alt="" fill priority unoptimized={bypassCoverOptimizer} className="object-cover" sizes="100vw" />
            ) : (
              <div className="h-full w-full bg-[linear-gradient(135deg,#f6f3f2_0%,#e4e2e1_45%,#bccabe_100%)]">
                <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(0,109,67,0.16),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-[size:auto,40px_40px,40px_40px]" />
              </div>
            )}
          </div>

          <div className="relative -mt-14 grid gap-5 pb-6 lg:grid-cols-[1fr_336px]">
            <Card className="overflow-hidden">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-end">
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border-4 border-white bg-primary font-display text-4xl font-bold text-white shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={user.name} fill unoptimized={bypassAvatarOptimizer} className="object-cover" sizes="112px" />
                    ) : (
                      initials(user.name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{user.name}</h1>
                      <Badge tone="primary" className="gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified profile
                      </Badge>
                    </div>
                    <p className="mt-2 max-w-3xl text-lg font-semibold text-foreground">{headline}</p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                      {user.location ? <InlineInfo icon={<MapPin className="h-4 w-4" />} value={user.location} /> : null}
                      {user.website ? (
                        <a className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" href={user.website}>
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
                <ContactRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
                <ContactRow icon={<Phone className="h-4 w-4" />} label="Phone" value={user.phone} />
                <ContactRow icon={<ShieldCheck className="h-4 w-4" />} label="Role" value={user.role ?? 'member'} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <div className="container-page mt-6 grid gap-6 lg:grid-cols-[1fr_336px]">
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-5 md:p-6">
              <SectionTitle title="About" />
              <p className="mt-3 max-w-4xl text-sm leading-6 text-muted md:text-base">{bio}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <SectionTitle title="Posts" meta={`${posts.length} services`} />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Public marketplace activity</span>
            </CardHeader>
            <CardContent className="grid gap-4 p-5 md:p-6">
              {posts.length ? (
                posts.map((post) => <ProfilePostCard key={post.id} post={post} user={user} />)
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
                        <div className="relative aspect-[16/9] bg-surface-muted">
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
              <SectionTitle title="Skills" meta={`${skills.length}`} />
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
              <SectionTitle title="Certifications" meta={`${certifications.length}`} />
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
    </main>
  )
}

function ProfilePostCard({ post, user }: { post: Job; user: MarketplaceProfile }) {
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
        <Link href={`/jobs/${post.id}`} className="relative block aspect-[16/10] bg-surface-muted md:aspect-auto">
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
              <Link href={`/jobs/${post.id}`}>
                <Button variant="secondary" size="sm">
                  View details
                </Button>
              </Link>
              <Button size="sm">Contact</Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {meta ? <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{meta}</span> : null}
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

function humanize(value: string) {
  return value.replace(/[_-]/g, ' ')
}
