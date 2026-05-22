import Image from 'next/image'
import Link from 'next/link'
import { Heart, Star } from 'lucide-react'
import { Badge, Button, Card } from '@/shared/ui'
import { currency, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { Job } from '@/shared/schemas'

export function JobCard({ job, priority = false }: { job: Job; priority?: boolean }) {
  const imageUrl = resolveAssetUrl(job.hinhAnh)
  const bypassOptimizer = shouldBypassImageOptimizer(job.hinhAnh)

  return (
    <Card className="group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
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
          <Button className="absolute right-3 top-3 bg-white/90" variant="secondary" size="icon" type="button" aria-label="Save service">
            <Heart className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {initials(job.nguoiDung?.name)}
            </span>
            <span className="min-w-0 text-sm font-semibold">{job.nguoiDung?.name ?? 'JobAura seller'}</span>
          </div>
          <h3 className="line-clamp-2 min-h-11 text-sm font-semibold leading-5">{job.tenCongViec}</h3>
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
      </Link>
    </Card>
  )
}
