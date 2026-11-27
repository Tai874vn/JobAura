'use client'

/**
 * Main /connections page with three tabs: Connections, Requests (incoming and sent), and Discover.
 * Supports debounced search, pagination, sending or answering requests, removing connections, and opening chat.
 *
 * Calls: GET /api/connections; GET /api/connections/suggestions; POST /api/connections/requests/:userId; PUT /api/connections/requests/:id/accept; DELETE /api/connections/:id; GET /api/chat/start/:userId; useSession; useChatStore; FeedAvatar; pageWindow
 * Used by:
 *   - app/(workspace)/connections/page.tsx
 */

import { connectionsConfig } from '@/features/connections/config/connections'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Check, ChevronLeft, ChevronRight, MapPin, MessageCircle, Search, UserMinus, UserPlus, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/hooks/use-session'
import { chatApi, connectionsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { Connection, ConnectionProfile, ConnectionSuggestion } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Card, ConfirmationDialog, EmptyState, Input, PageHeader, Skeleton } from '@/shared/ui'
import { FeedAvatar } from '@/features/feed/components/feed-avatar'
import { pageWindow } from '../utils/connections-data'

type ConnectionsTab = 'connections' | 'requests' | 'discover'

/**
 * /connections with three tabs: Connections, Requests (the number of received requests is on the tab) and
 * Discover ("people you may know"). Typing in the search box waits 400 ms, then searches and goes back to page 1.
 * Only the open tab's list is fetched; requests always load. Send / accept / remove refresh every 'connections'
 * query, and Message opens the chat window for that person.
 */
export function ConnectionsPage() {
  const [tab, setTab] = useState<ConnectionsTab>('connections')
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [connectionsPage, setConnectionsPage] = useState(1)
  const [discoverPage, setDiscoverPage] = useState(1)
  const [connectionToRemove, setConnectionToRemove] = useState<Connection | null>(null)
  const queryClient = useQueryClient()
  const { user } = useSession()
  const viewerId = user?.id
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim())
      setConnectionsPage(1)
      setDiscoverPage(1)
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [keyword])

  const connectionsParams = useMemo(
    () => ({ page: connectionsPage, pageSize: connectionsConfig.pageSize, keyword: debouncedKeyword || undefined }),
    [connectionsPage, debouncedKeyword]
  )
  const suggestionsParams = useMemo(
    () => ({ page: discoverPage, pageSize: connectionsConfig.pageSize, keyword: debouncedKeyword || undefined }),
    [discoverPage, debouncedKeyword]
  )
  // Data: connectionsApi.all → GET /api/connections → NestjsBE/src/modules/connections/services/connections.service.ts getConnections()
  const connectionsQuery = useQuery({
    queryKey: queryKeys.connections(connectionsParams, viewerId),
    queryFn: () => connectionsApi.all(connectionsParams),
    enabled: tab === 'connections',
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
  const requestsQuery = useQuery({ queryKey: queryKeys.connectionRequests(viewerId), queryFn: connectionsApi.requests })
  // Data: connectionsApi.suggestions → GET /api/connections/suggestions → NestjsBE/src/modules/connections/services/connections.service.ts getSuggestions()
  const suggestionsQuery = useQuery({
    queryKey: queryKeys.connectionSuggestions(suggestionsParams, viewerId),
    queryFn: () => connectionsApi.suggestions(suggestionsParams),
    enabled: tab === 'discover',
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['connections'] })
  // Data: connectionsApi.send → POST /api/connections/requests/:userId → NestjsBE/src/modules/connections/services/connections.service.ts sendRequest()
  const sendMutation = useMutation({
    mutationFn: connectionsApi.send,
    onSuccess: async () => {
      await refresh()
      toast.success('Connection request sent')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not send request')),
  })
  // Data: connectionsApi.accept → PUT /api/connections/requests/:id/accept → NestjsBE/src/modules/connections/services/connections.service.ts acceptRequest()
  const acceptMutation = useMutation({
    mutationFn: connectionsApi.accept,
    onSuccess: async () => {
      await refresh()
      toast.success('Connection request accepted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not accept request')),
  })
  // Data: connectionsApi.remove → DELETE /api/connections/:id → NestjsBE/src/modules/connections/services/connections.service.ts deleteConnection()
  const removeMutation = useMutation({
    mutationFn: connectionsApi.remove,
    onSuccess: async (_response, connectionId) => {
      const isIncoming = requestsQuery.data?.content?.incoming.some((request) => request.id === connectionId)
      const isOutgoing = requestsQuery.data?.content?.outgoing.some((request) => request.id === connectionId)
      await refresh()
      if (connectionToRemove?.id === connectionId) setConnectionToRemove(null)
      toast.success(isIncoming ? 'Connection request declined' : isOutgoing ? 'Connection request cancelled' : 'Connection removed')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update connection')),
  })
  // Data: chatApi.start → GET /api/chat/start/:userId → NestjsBE/src/modules/chat/services/chat.service.ts findPrivateRoom()
  const messageMutation = useMutation({
    mutationFn: chatApi.start,
    onSuccess: (response) => {
      if (response.content) {
        openChatForRoom(response.content)
        void queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms(viewerId) })
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not open conversation')),
  })

  const requests = requestsQuery.data?.content
  const connections = connectionsQuery.data?.content?.data ?? []
  const suggestions = suggestionsQuery.data?.content?.data ?? []

  return (
    <div className="container-page py-8">
      <PageHeader
        title="Connections"
        actions={
          tab !== 'requests' ? (
            <label className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
              <Input
                className="pl-9"
                value={keyword}
                maxLength={80}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={connectionsConfig.searchPlaceholder}
                aria-label="Search connections"
              />
            </label>
          ) : undefined
        }
      />

      <div className="mt-6 flex overflow-x-auto border-b border-border">
        <Tab active={tab === 'connections'} label="Connections" onClick={() => setTab('connections')} />
        <Tab active={tab === 'requests'} label={`Requests${requests?.incomingCount ? ` (${requests.incomingCount})` : ''}`} onClick={() => setTab('requests')} />
        <Tab active={tab === 'discover'} label="Discover" onClick={() => setTab('discover')} />
      </div>

      <div className="mt-6">
        {tab === 'connections' ? (
          connectionsQuery.isError && !connectionsQuery.data ? (
            <EmptyState
              icon={<AlertCircle />}
              title="Could not load connections"
              description={getErrorMessage(connectionsQuery.error, 'Please try again in a moment.')}
              action={
                <Button type="button" variant="secondary" loading={connectionsQuery.isFetching} onClick={() => connectionsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : connectionsQuery.isPending ? (
            <PeopleGrid
              loading
              stale={false}
              empty="No connections yet. Discover people to start building your network."
            >
              {null}
            </PeopleGrid>
          ) : (
            <div className="results-in">
              <PeopleGrid
                loading={false}
                stale={connectionsQuery.isPlaceholderData}
                empty="No connections yet. Discover people to start building your network."
              >
                {connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} messaging={messageMutation.isPending && messageMutation.variables === connection.user.id} onMessage={() => messageMutation.mutate(connection.user.id)} onRemove={() => setConnectionToRemove(connection)} />)}
              </PeopleGrid>
              <PaginationControls
                pageIndex={connectionsQuery.data?.content?.pageIndex}
                totalPages={connectionsQuery.data?.content?.totalPages}
                isFetching={connectionsQuery.isFetching}
                onPageChange={setConnectionsPage}
              />
            </div>
          )
        ) : null}

        {tab === 'requests' ? (
          requestsQuery.isError && !requestsQuery.data ? (
            <EmptyState
              icon={<AlertCircle />}
              title="Could not load requests"
              description={getErrorMessage(requestsQuery.error, 'Please try again in a moment.')}
              action={
                <Button type="button" variant="secondary" loading={requestsQuery.isFetching} onClick={() => requestsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : requestsQuery.isPending ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <RequestSection title="Incoming" loading empty="No incoming requests.">
                {null}
              </RequestSection>
              <RequestSection title="Sent" loading empty="No sent requests.">
                {null}
              </RequestSection>
            </div>
          ) : (
            <div className="results-in grid gap-8 lg:grid-cols-2">
              <RequestSection title="Incoming" loading={false} empty="No incoming requests.">
                {(requests?.incoming ?? []).map((connection) => <RequestCard key={connection.id} connection={connection} incoming accepting={acceptMutation.isPending && acceptMutation.variables === connection.id} removing={removeMutation.isPending && removeMutation.variables === connection.id} onAccept={() => acceptMutation.mutate(connection.id)} onRemove={() => removeMutation.mutate(connection.id)} />)}
              </RequestSection>
              <RequestSection title="Sent" loading={false} empty="No sent requests.">
                {(requests?.outgoing ?? []).map((connection) => <RequestCard key={connection.id} connection={connection} removing={removeMutation.isPending && removeMutation.variables === connection.id} onRemove={() => removeMutation.mutate(connection.id)} />)}
              </RequestSection>
            </div>
          )
        ) : null}

        {tab === 'discover' ? (
          suggestionsQuery.isError && !suggestionsQuery.data ? (
            <EmptyState
              icon={<AlertCircle />}
              title="Could not load suggestions"
              description={getErrorMessage(suggestionsQuery.error, 'Please try again in a moment.')}
              action={
                <Button type="button" variant="secondary" loading={suggestionsQuery.isFetching} onClick={() => suggestionsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : suggestionsQuery.isPending ? (
            <PeopleGrid
              loading
              stale={false}
              empty="No new suggestions match this search."
            >
              {null}
            </PeopleGrid>
          ) : (
            <div className="results-in">
              <PeopleGrid
                loading={false}
                stale={suggestionsQuery.isPlaceholderData}
                empty="No new suggestions match this search."
              >
                {suggestions.map((person) => <SuggestionCard key={person.id} person={person} pending={sendMutation.isPending && sendMutation.variables === person.id} onConnect={() => sendMutation.mutate(person.id)} />)}
              </PeopleGrid>
              <PaginationControls
                pageIndex={suggestionsQuery.data?.content?.pageIndex}
                totalPages={suggestionsQuery.data?.content?.totalPages}
                isFetching={suggestionsQuery.isFetching}
                onPageChange={setDiscoverPage}
              />
            </div>
          )
        ) : null}
      </div>
      <ConfirmationDialog
        open={Boolean(connectionToRemove)}
        title={`Unfriend ${connectionToRemove?.user.name ?? 'this person'}?`}
        description={`This removes ${connectionToRemove?.user.name ?? 'this person'} from your connections. You can send another request later.`}
        confirmLabel="Unfriend"
        pending={removeMutation.isPending && removeMutation.variables === connectionToRemove?.id}
        onCancel={() => setConnectionToRemove(null)}
        onConfirm={() => {
          if (connectionToRemove) removeMutation.mutate(connectionToRemove.id)
        }}
      />
    </div>
  )
}

function Tab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`h-11 shrink-0 border-b-2 px-5 text-sm font-medium ${active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>{label}</button>
}

function PeopleGrid({ loading, stale = false, empty, children }: { loading: boolean; stale?: boolean; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading people" aria-busy="true">
        <span className="sr-only">Loading people</span>
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="p-4" aria-hidden="true">
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="mt-4 flex min-h-7 gap-2">
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-6 w-20 rounded" />
            </div>
            <div className="mt-5 border-t border-border pt-4">
              <Skeleton className="h-8 w-full rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    )
  }
  if (!count) return <EmptyState icon={<Users />} title="Nobody here yet" description={empty} />
  return (
    <div className={cn('grid gap-4 transition-opacity duration-200 md:grid-cols-2 xl:grid-cols-3', stale && 'opacity-60')} aria-busy={stale}>
      {children}
    </div>
  )
}

function PaginationControls({
  pageIndex = 1,
  totalPages = 1,
  isFetching,
  onPageChange,
}: {
  pageIndex?: number | null
  totalPages?: number | null
  isFetching: boolean
  onPageChange: (page: number) => void
}) {
  const current = pageIndex ?? 1
  const total = totalPages ?? 1
  if (total <= 1) return null
  const pages = pageWindow(current, total)

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Connection pages">
      <Button type="button" variant="secondary" size="sm" disabled={current <= 1 || isFetching} onClick={() => onPageChange(current - 1)}>
        <ChevronLeft className="h-4 w-4" /> Previous
      </Button>
      {pages.map((page) => (
        <Button
          key={page}
          type="button"
          variant={page === current ? 'primary' : 'secondary'}
          size="sm"
          disabled={isFetching && page === current}
          onClick={() => onPageChange(page)}
          aria-current={page === current ? 'page' : undefined}
        >
          {page}
        </Button>
      ))}
      <Button type="button" variant="secondary" size="sm" disabled={current >= total || isFetching} onClick={() => onPageChange(current + 1)}>
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

function ProfileSummary({ user }: { user: ConnectionProfile }) {
  return <div className="flex gap-3"><FeedAvatar user={user} size="lg" /><div className="min-w-0"><Link href={`/profile/${user.id}`} className="block truncate font-medium hover:text-primary">{user.name}</Link><p className="line-clamp-2 text-sm text-muted">{user.headline || 'JobAura member'}</p>{user.location ? <p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" />{user.location}</p> : null}</div></div>
}

function SkillList({ user, highlighted = [] }: { user: ConnectionProfile; highlighted?: string[] }) {
  const skills = highlighted.length ? highlighted : user.profileSkills.slice(0, connectionsConfig.skillsPerCard).map((skill) => skill.name)
  return <div className="mt-4 flex min-h-7 flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded border border-border bg-surface-muted px-2 py-1 text-xs font-medium">{skill}</span>)}</div>
}

function ConnectionCard({ connection, messaging, onMessage, onRemove }: { connection: Connection; messaging: boolean; onMessage: () => void; onRemove: () => void }) {
  return <Card className="p-4"><ProfileSummary user={connection.user} /><SkillList user={connection.user} /><div className="mt-5 flex gap-2 border-t border-border pt-4"><Button className="flex-1" size="sm" loading={messaging} onClick={onMessage}><MessageCircle className="h-4 w-4" />Message</Button><Button variant="secondary" size="icon" onClick={onRemove} title="Remove connection"><UserMinus className="h-4 w-4" /></Button></div></Card>
}

function RequestCard({ connection, incoming = false, accepting = false, removing = false, onAccept, onRemove }: { connection: Connection; incoming?: boolean; accepting?: boolean; removing?: boolean; onAccept?: () => void; onRemove: () => void }) {
  return <Card className="p-4"><ProfileSummary user={connection.user} /><div className="mt-4 flex gap-2">{incoming ? <Button size="sm" loading={accepting} disabled={removing} onClick={onAccept}><Check className="h-4 w-4" />Accept</Button> : null}<Button size="sm" variant="secondary" loading={removing} disabled={accepting} onClick={onRemove}><X className="h-4 w-4" />{incoming ? 'Reject' : 'Cancel'}</Button></div></Card>
}

function SuggestionCard({ person, pending, onConnect }: { person: ConnectionSuggestion; pending: boolean; onConnect: () => void }) {
  return <Card className="p-4"><ProfileSummary user={person} /><SkillList user={person} highlighted={person.sharedSkills} /><div className="mt-5 border-t border-border pt-4"><Button className="w-full" size="sm" onClick={onConnect} loading={pending}><UserPlus className="h-4 w-4" />Connect</Button></div></Card>
}

function RequestSection({ title, loading = false, empty, children }: { title: string; loading?: boolean; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  return (
    <section aria-busy={loading}>
      <h2 className="mb-3 font-display text-lg font-medium">{title}</h2>
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 2 }, (_, index) => (
            <Card key={index} className="p-4" aria-hidden="true">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-48 max-w-full" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </Card>
          ))
        ) : count ? children : (
          <Card className="p-6 text-sm text-muted">{empty}</Card>
        )}
      </div>
    </section>
  )
}
