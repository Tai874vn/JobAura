import Image from 'next/image'
import Link from 'next/link'
import { initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'

export function FeedAvatar({
  user,
  size = 'md',
}: {
  user: { id: number; name: string; avatar?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const source = resolveAssetUrl(user.avatar)
  const dimensions = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'xl' ? 'h-16 w-16 text-base' : size === 'lg' ? 'h-12 w-12 text-sm' : 'h-10 w-10 text-xs'

  return (
    <Link
      href={`/profile/${user.id}`}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white ${dimensions}`}
      aria-label={`View ${user.name}'s profile`}
    >
      {source ? (
        <Image
          src={source}
          alt={user.name}
          fill
          unoptimized={shouldBypassImageOptimizer(user.avatar)}
          className="object-cover"
          sizes={size === 'sm' ? '32px' : size === 'xl' ? '64px' : size === 'lg' ? '48px' : '40px'}
        />
      ) : (
        initials(user.name)
      )}
    </Link>
  )
}
