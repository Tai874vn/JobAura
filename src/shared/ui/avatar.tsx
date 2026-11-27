/**
 * Shared UI circular user avatar. Shows the user's photo when available, or falls back to their initials on a colored circle.
 *
 * Calls: cn; initials; resolveAssetUrl; shouldBypassImageOptimizer
 * Used by:
 *   - shared/ui/index.ts
 */

import Image from 'next/image'
import { cn, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'

const avatarSizes = {
  sm: { box: 'h-8 w-8 text-xs', sizes: '32px' },
  md: { box: 'h-10 w-10 text-xs', sizes: '40px' },
  lg: { box: 'h-12 w-12 text-sm', sizes: '48px' },
  xl: { box: 'h-16 w-16 text-base', sizes: '64px' },
} as const

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof avatarSizes
  className?: string
}) {
  const source = resolveAssetUrl(src)
  const dims = avatarSizes[size]

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-medium text-white',
        dims.box,
        className
      )}
    >
      {source ? (
        <Image
          src={source}
          alt={name}
          fill
          unoptimized={shouldBypassImageOptimizer(src)}
          className="object-cover"
          sizes={dims.sizes}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
