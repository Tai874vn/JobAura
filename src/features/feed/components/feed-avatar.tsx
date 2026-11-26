import Link from 'next/link'
import { Avatar } from '@/shared/ui'

export function FeedAvatar({
  user,
  size = 'md',
}: {
  user: { id: number; name: string; avatar?: string | null }
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  return (
    <Link href={`/profile/${user.id}`} className="shrink-0" aria-label={`View ${user.name}'s profile`}>
      <Avatar name={user.name} src={user.avatar} size={size} />
    </Link>
  )
}
