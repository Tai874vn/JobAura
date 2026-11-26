'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { Badge, Card, CardSkeleton } from '@/shared/ui'
import { cn, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { servicePriceLabel } from '../../utils/service-price'
import type { Job } from '@/shared/schemas'
import { getSellerAvatar, getSellerHref, getSellerName } from '../../utils/seller-profile'
import { JobSaveButton } from '../detail/job-save-button'

/**
 * One service / portfolio post as a card in the /jobs list (image, seller, price, save button).
 */
export function JobCard({ job, priority = false, initialSaved = false, waitForImages = false }: { job: Job; priority?: boolean; initialSaved?: boolean; waitForImages?: boolean }) {
  const imageUrl = resolveAssetUrl(job.image)
  const avatarUrl = resolveAssetUrl(getSellerAvatar(job))

  // A changed service/image starts a fresh readiness cycle, not the previous image's state.
  return <ReadyJobCard key={JSON.stringify([job.id, imageUrl, avatarUrl])} job={job} imageUrl={imageUrl} avatarUrl={avatarUrl} priority={priority} initialSaved={initialSaved} waitForImages={waitForImages} />
}

function ReadyJobCard({ job, imageUrl, avatarUrl, priority, initialSaved, waitForImages }: {
  job: Job; imageUrl?: string; avatarUrl?: string; priority: boolean; initialSaved: boolean; waitForImages: boolean
}) {
  const [cover, setCover] = useState(imageUrl ? 'pending' : 'ready')
  const [avatar, setAvatar] = useState(avatarUrl ? 'pending' : 'ready')
  const ready = !waitForImages || (cover !== 'pending' && avatar !== 'pending')
  const bypassOptimizer = shouldBypassImageOptimizer(job.image)
  const sellerName = getSellerName(job)
  const sellerHref = getSellerHref(job)
  const sellerAvatarSource = getSellerAvatar(job)
  const sellerAvatarUrl = avatar === 'failed' ? undefined : avatarUrl
  const bypassSellerAvatarOptimizer = shouldBypassImageOptimizer(sellerAvatarSource)

  return (
    <div className="relative min-w-0" aria-busy={!ready}>
      <Card inert={!ready || undefined} aria-hidden={!ready || undefined} className={cn('group overflow-hidden transition hover:shadow-float', !ready && 'pointer-events-none opacity-0')}>
        <div className="relative">
          <Link href={`/jobs/${job.id}`} className="block">
            <div className="relative aspect-[4/3] bg-surface-muted">
              {imageUrl && cover !== 'failed' ? (
                <Image
                  src={imageUrl}
                  alt={job.title}
                  fill
                  priority={priority}
                  unoptimized={bypassOptimizer}
                  className="object-cover"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  onLoad={() => setCover('ready')}
                  onError={() => setCover('failed')}
                />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-4xl font-medium text-primary/30">
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
              <SellerAvatar name={sellerName} src={sellerAvatarUrl} bypassOptimizer={bypassSellerAvatarOptimizer} onLoad={() => setAvatar('ready')} onError={() => setAvatar('failed')} />
              <span className="min-w-0 truncate text-sm font-medium">{sellerName}</span>
            </Link>
          ) : (
            <div className="mb-3 flex items-center gap-2">
              <SellerAvatar name={sellerName} src={sellerAvatarUrl} bypassOptimizer={bypassSellerAvatarOptimizer} onLoad={() => setAvatar('ready')} onError={() => setAvatar('failed')} />
              <span className="min-w-0 truncate text-sm font-medium">{sellerName}</span>
            </div>
          )}
          <Link href={`/jobs/${job.id}`} className="block">
            <h3 className="line-clamp-2 min-h-11 text-sm font-medium leading-5 hover:text-primary">{job.title}</h3>
          </Link>
          <div className="mt-3 flex items-center justify-between">
            {/* A star only once someone has reviewed it; portfolio posts usually have no reviews. */}
            {job.reviews ? (
              <Badge tone="rating">
                <Star className="mr-1 h-3 w-3 fill-rating text-rating" />
                {(job.rating ?? 0).toFixed(1)}
              </Badge>
            ) : <span />}
            <span className="text-sm font-medium text-foreground">{servicePriceLabel(job.price) ?? 'Portfolio'}</span>
          </div>
        </div>
      </Card>
      {!ready ? <div className="pointer-events-none absolute inset-0">
        <CardSkeleton className="h-full" />
        <span className="sr-only">Loading service</span>
      </div> : null}
    </div>
  )
}

function SellerAvatar({ name, src, bypassOptimizer, onLoad, onError }: { name: string; src?: string; bypassOptimizer: boolean; onLoad: () => void; onError: () => void }) {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-medium text-white">
      {src ? <Image src={src} alt={name} fill unoptimized={bypassOptimizer} className="object-cover" sizes="32px" onLoad={onLoad} onError={onError} /> : initials(name)}
    </span>
  )
}
