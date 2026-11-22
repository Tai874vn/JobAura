import { formatCredit, formatYears } from '@/features/users/resume-career'
import { occupationLabel } from '@/features/occupations/api'
import {
  BriefcaseBusiness,
  Building2,
  Clock3,
  Download,
  FileJson,
  FileText,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { hasResumeDraftInput, resumeSkills, type ResumeDraft } from '@/features/users/resume'
import { initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { servicePriceLabel } from '@/features/jobs/service-price'
import type { Job, UserProfile, UserResume } from '@/shared/schemas'
import { Badge, ButtonLink, Card, CardContent } from '@/shared/ui'
import { InlineEditButton, ResumeSnippet } from './profile-editor'
import { formatDate, formatFullDate, type MarketplaceProfile } from './model'

export function ProfilePostCard({ post, user }: { post: Job; user: MarketplaceProfile | UserProfile }) {
  const imageUrl = resolveAssetUrl(post.image)
  const bypassOptimizer = shouldBypassImageOptimizer(post.image)
  const hasRating = (post.rating ?? 0) > 0

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted">{post.createdAt ? formatDate(post.createdAt) : 'Portfolio post'}</span>
          </span>
        </div>
        {hasRating ? (
          <Badge tone="rating">
            <Star className="mr-1 h-3 w-3 fill-rating text-rating" />
            {(post.rating ?? 0).toFixed(1)}
          </Badge>
        ) : (
          <Badge>New · no reviews yet</Badge>
        )}
      </div>
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <Link href={`/jobs/${post.id}`} className="relative block aspect-16/10 bg-surface-muted md:aspect-auto">
          {imageUrl ? (
            <Image src={imageUrl} alt={post.title} fill unoptimized={bypassOptimizer} className="object-cover" sizes="(min-width: 768px) 220px, 100vw" />
          ) : (
            <span className="flex h-full items-center justify-center text-primary">
              <BriefcaseBusiness className="h-8 w-8" />
            </span>
          )}
        </Link>
        <div className="grid gap-4 p-4">
          <div>
            <Link href={`/jobs/${post.id}`} className="font-display text-xl font-medium leading-snug hover:text-primary">
              {post.title}
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
              {post.shortDescription || post.description || 'A portfolio post on JobAura.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium">{servicePriceLabel(post.price) ?? 'Portfolio'}</span>
            <ButtonLink href={`/jobs/${post.id}`} variant="secondary" size="sm">
              View details
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  )
}

export function ResumeShowcase({
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
  // Counted by the backend from the saved jobs; the profile shows the saved resume, so it is always current.
  const years = resume?.occupationYears ?? null
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
                    <h3 className="font-display text-2xl font-medium">{draft.Name || 'Resume profile'}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                      {draft.Email ? <InlineInfo icon={<Mail className="h-4 w-4" />} value={draft.Email} /> : null}
                      {draft.Phone ? <InlineInfo icon={<Phone className="h-4 w-4" />} value={draft.Phone} /> : null}
                      {draft.Location ? <InlineInfo icon={<MapPin className="h-4 w-4" />} value={draft.Location} /> : null}
                      {draft.Role ? <InlineInfo icon={<BriefcaseBusiness className="h-4 w-4" />} value={draft.Role} /> : null}
                      {years ? <InlineInfo icon={<Building2 className="h-4 w-4" />} value={occupationLabel(years.occupation.title)} /> : null}
                      {years ? <InlineInfo icon={<Clock3 className="h-4 w-4" />}
                        value={`${formatYears(years.years)} in occupation${years.related ? `, +${formatCredit(years.related)} yr related` : ''}`} /> : null}
                    </div>
                  </div>
                  {fileUrl ? (
                    <a
                      href={fileUrl}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary"
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
                <p className="text-sm font-medium">Resume data</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {resume?.sourceFileName ? resume.sourceFileName : resume ? 'Structured resume saved' : 'No source file attached'}
              </p>
              {skills.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.slice(0, 10).map((skill) => (
                    <span key={skill} className="rounded bg-accent/40 px-2 py-1 text-xs font-medium text-foreground">
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

export function SectionTitle({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <div className="flex items-center gap-2">
        {meta ? <span className="text-xs font-medium text-muted">{meta}</span> : null}
        {action}
      </div>
    </div>
  )
}

export function InlineInfo({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {value}
    </span>
  )
}

export function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-muted">{label}</span>
        <span className="block truncate font-medium">{value || '-'}</span>
      </span>
    </div>
  )
}

export function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm text-muted">
      <span className="text-primary">{icon}</span>
      {text}
    </div>
  )
}
