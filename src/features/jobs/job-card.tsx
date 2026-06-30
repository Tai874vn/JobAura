import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { Badge, Card } from '@/shared/ui'
import { currency, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { Job } from '@/shared/schemas'
import { getSellerAvatar, getSellerHref, getSellerName } from './seller-profile'
import { JobSaveButton } from './job-save-button'

export function JobCard({ job, priority = false, initialSaved = false }: { job: Job; priority?: boolean; initialSaved?: boolean }) {
  const imageUrl = resolveAssetUrl(job.hinhAnh)
  const bypassOptimizer = shouldBypassImageOptimizer(job.hinhAnh)
  const sellerName = getSellerName(job)
  const sellerHref = getSellerHref(job)
  const sellerAvatarSource = getSellerAvatar(job)
  const sellerAvatarUrl = resolveAssetUrl(sellerAvatarSource)
  const bypassSellerAvatarOptimizer = shouldBypassImageOptimizer(sellerAvatarSource)

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
      <div className="relative">
        <Link href={`/jobs/${job.id}`} className="block">
          <div className="relative aspect-[4/3] bg-surface-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={job.tenCongViec}
                fill
                priority={priority}
                unoptimized={bypassOptimizer}
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-4xl font-bold text-primary/30">
                JA
              </div>
            )}
          </div>
        </Link>
        <JobSaveButton jobId={job.id} initialSaved={initialSaved} />
      </div>
      <div className="p-4">
        {sellerHref ? (
          <Link href={sellerHref} className="mb-3 flex w-fit max-w-full items-center gap-2 rounded hover:text-primary">
            <SellerAvatar name={sellerName} src={sellerAvatarUrl} bypassOptimizer={bypassSellerAvatarOptimizer} />
            <span className="min-w-0 truncate text-sm font-semibold">{sellerName}</span>
          </Link>
        ) : (
          <div className="mb-3 flex items-center gap-2">
            <SellerAvatar name={sellerName} src={sellerAvatarUrl} bypassOptimizer={bypassSellerAvatarOptimizer} />
            <span className="min-w-0 truncate text-sm font-semibold">{sellerName}</span>
          </div>
        )}
        <Link href={`/jobs/${job.id}`} className="block">
          <h3 className="line-clamp-2 min-h-11 text-sm font-semibold leading-5 hover:text-primary">{job.tenCongViec}</h3>
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <Badge tone="rating">
            <Star className="mr-1 h-3 w-3 fill-rating text-rating" />
            {(job.saoCongViec ?? 0).toFixed(1)}
          </Badge>
          <span className="text-sm text-muted">
            From <strong className="text-foreground">{currency(job.giaTien)}</strong>
          </span>
        </div>
      </div>
    </Card>
  )
}

function SellerAvatar({ name, src, bypassOptimizer }: { name: string; src?: string; bypassOptimizer: boolean }) {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
      {src ? <Image src={src} alt={name} fill unoptimized={bypassOptimizer} className="object-cover" sizes="32px" /> : initials(name)}
    </span>
  )
}
