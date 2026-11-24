'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { connectionsApi, skillsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { ConnectionSuggestion } from '@/shared/schemas'
import { Button, Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'

const desktopRailMedia = '(min-width: 1280px)'

export function RightFeedRail() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopRailMedia)
    const updateVisibility = () => setVisible(mediaQuery.matches)

    updateVisibility()
    mediaQuery.addEventListener('change', updateVisibility)
    return () => mediaQuery.removeEventListener('change', updateVisibility)
  }, [])

  return visible ? <RightFeedRailContent /> : null
}

function RightFeedRailContent() {
  const { user } = useSession()
  const skillsQuery = useQuery({ queryKey: ['skills', 'feed'], queryFn: skillsApi.all, staleTime: 300_000 })
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.connectionSuggestions({ page: 1, pageSize: 2 }, user?.id),
    queryFn: () => connectionsApi.suggestions({ page: 1, pageSize: 2 }),
    staleTime: 60_000,
  })

  const skills = skillsQuery.data?.content?.slice(0, 6) ?? []
  const suggestions = (suggestionsQuery.data?.content?.data ?? []).slice(0, 2)

  return (
    <aside className="sticky top-20 hidden h-fit space-y-4 xl:block">
      {suggestions.length ? <SuggestedPeople suggestions={suggestions} /> : null}

      {skills.length ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">Trending skills</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Link key={skill} href={`/hiring-posts?keyword=${encodeURIComponent(skill)}`} className="rounded-md border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary/40 hover:text-primary">
                {skill}
              </Link>
            ))}
          </div>
        </Card>
      ) : null}

      <nav className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1 text-xs text-muted" aria-label="Footer">
        <Link href="/welcome" className="hover:text-primary hover:underline">About</Link>
        <Link href="/welcome#how-it-works" className="hover:text-primary hover:underline">How it works</Link>
        <Link href="/welcome#faq" className="hover:text-primary hover:underline">FAQ</Link>
        <Link href="/jobs" className="hover:text-primary hover:underline">Portfolios</Link>
      </nav>
    </aside>
  )
}

function SuggestedPeople({ suggestions }: { suggestions: ConnectionSuggestion[] }) {
  const queryClient = useQueryClient()
  const [sentIds, setSentIds] = useState<Set<number>>(new Set())
  const sendMutation = useMutation({
    mutationFn: (userId: number) => connectionsApi.send(userId),
    onSuccess: (_response, userId) => {
      setSentIds((current) => new Set(current).add(userId))
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      toast.success('Connection request sent')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send request')),
  })

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium">People you may know</h2>
      </div>
      <div className="mt-2 divide-y divide-border">
        {suggestions.map((person) => {
          const sent = sentIds.has(person.id)
          return (
            <div key={person.id} className="flex items-center gap-2.5 py-2.5">
              <FeedAvatar user={person} />
              <div className="min-w-0 flex-1">
                <Link href={`/profile/${person.id}`} className="block truncate text-sm font-medium hover:text-primary">{person.name}</Link>
                <p className="truncate text-xs text-muted">{person.headline || 'JobAura member'}</p>
              </div>
              <Button
                type="button"
                size="sm"
                loading={sendMutation.isPending && sendMutation.variables === person.id}
                disabled={sent || sendMutation.isPending}
                onClick={() => sendMutation.mutate(person.id)}
                className={cn(
                  'h-[30px] shrink-0 gap-1.5 font-medium',
                  sent ? 'bg-primary/10 text-primary' : 'bg-primary text-white hover:bg-primary-strong',
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {sent ? 'Sent' : 'Connect'}
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
