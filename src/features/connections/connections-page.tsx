'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, MapPin, MessageCircle, Search, UserMinus, UserPlus, Users, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { chatApi, connectionsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { Connection, ConnectionProfile, ConnectionSuggestion } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button, Card, ConfirmationDialog, Skeleton } from '@/shared/ui'
import { FeedAvatar } from '@/features/feed/feed-avatar'

type ConnectionsTab = 'connections' | 'requests' | 'discover'

export function ConnectionsPage() {
  const [tab, setTab] = useState<ConnectionsTab>('connections')
  const [keyword, setKeyword] = useState('')
  const [connectionToRemove, setConnectionToRemove] = useState<Connection | null>(null)
  const queryClient = useQueryClient()
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)
  const params = { page: 1, pageSize: 24, keyword: keyword.trim() || undefined }
  const connectionsQuery = useQuery({ queryKey: queryKeys.connections(params), queryFn: () => connectionsApi.all(params), enabled: tab === 'connections' })
  const requestsQuery = useQuery({ queryKey: queryKeys.connectionRequests, queryFn: connectionsApi.requests })
  const suggestionsQuery = useQuery({ queryKey: queryKeys.connectionSuggestions(params), queryFn: () => connectionsApi.suggestions(params), enabled: tab === 'discover' })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['connections'] })
  const sendMutation = useMutation({ mutationFn: connectionsApi.send, onSuccess: refresh, onError: (error) => toast.error(getErrorMessage(error, 'Could not send request')) })
  const acceptMutation = useMutation({ mutationFn: connectionsApi.accept, onSuccess: refresh, onError: (error) => toast.error(getErrorMessage(error, 'Could not accept request')) })
  const removeMutation = useMutation({
    mutationFn: connectionsApi.remove,
    onSuccess: async (_response, connectionId) => {
      await refresh()
      if (connectionToRemove?.id === connectionId) setConnectionToRemove(null)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update connection')),
  })
  const messageMutation = useMutation({
    mutationFn: chatApi.start,
    onSuccess: (response) => { if (response.content) openChatForRoom(response.content) },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not open conversation')),
  })

  const requests = requestsQuery.data?.content
  const connections = connectionsQuery.data?.content?.data ?? []
  const suggestions = suggestionsQuery.data?.content?.data ?? []

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-display text-3xl font-bold">Connections</h1><p className="mt-1 text-sm text-muted">Build and manage your professional network.</p></div>
        {tab !== 'requests' ? (
          <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-white px-3">
            <Search className="h-4 w-4 text-muted" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search people, skills, or location" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        ) : null}
      </div>

      <div className="mt-6 flex overflow-x-auto border-b border-border">
        <Tab active={tab === 'connections'} label="Connections" onClick={() => setTab('connections')} />
        <Tab active={tab === 'requests'} label={`Requests${requests?.incomingCount ? ` (${requests.incomingCount})` : ''}`} onClick={() => setTab('requests')} />
        <Tab active={tab === 'discover'} label="Discover" onClick={() => setTab('discover')} />
      </div>

      <div className="mt-6">
        {tab === 'connections' ? (
          <PeopleGrid loading={connectionsQuery.isPending} empty="No connections yet. Discover people to start building your network.">
            {connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} onMessage={() => messageMutation.mutate(connection.user.id)} onRemove={() => setConnectionToRemove(connection)} />)}
          </PeopleGrid>
        ) : null}

        {tab === 'requests' ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <RequestSection title="Incoming" empty="No incoming requests.">
              {(requests?.incoming ?? []).map((connection) => <RequestCard key={connection.id} connection={connection} incoming onAccept={() => acceptMutation.mutate(connection.id)} onRemove={() => removeMutation.mutate(connection.id)} />)}
            </RequestSection>
            <RequestSection title="Sent" empty="No sent requests.">
              {(requests?.outgoing ?? []).map((connection) => <RequestCard key={connection.id} connection={connection} onRemove={() => removeMutation.mutate(connection.id)} />)}
            </RequestSection>
          </div>
        ) : null}

        {tab === 'discover' ? (
          <PeopleGrid loading={suggestionsQuery.isPending} empty="No new suggestions match this search.">
            {suggestions.map((person) => <SuggestionCard key={person.id} person={person} pending={sendMutation.isPending && sendMutation.variables === person.id} onConnect={() => sendMutation.mutate(person.id)} />)}
          </PeopleGrid>
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
  return <button type="button" onClick={onClick} className={`h-11 shrink-0 border-b-2 px-5 text-sm font-semibold ${active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>{label}</button>
}

function PeopleGrid({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  if (loading) return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((id) => <Skeleton key={id} className="h-48" />)}</div>
  if (!count) return <Card className="p-10 text-center"><Users className="mx-auto h-6 w-6 text-primary" /><p className="mt-3 text-sm text-muted">{empty}</p></Card>
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
}

function ProfileSummary({ user }: { user: ConnectionProfile }) {
  return <div className="flex gap-3"><FeedAvatar user={user} size="lg" /><div className="min-w-0"><Link href={`/profile/${user.id}`} className="block truncate font-bold hover:text-primary">{user.name}</Link><p className="line-clamp-2 text-sm text-muted">{user.headline || 'JobAura member'}</p>{user.location ? <p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3 w-3" />{user.location}</p> : null}</div></div>
}

function SkillList({ user, highlighted = [] }: { user: ConnectionProfile; highlighted?: string[] }) {
  const skills = highlighted.length ? highlighted : user.profileSkills.slice(0, 3).map((skill) => skill.name)
  return <div className="mt-4 flex min-h-7 flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded border border-border bg-surface-muted px-2 py-1 text-xs font-semibold">{skill}</span>)}</div>
}

function ConnectionCard({ connection, onMessage, onRemove }: { connection: Connection; onMessage: () => void; onRemove: () => void }) {
  return <Card className="p-4"><ProfileSummary user={connection.user} /><SkillList user={connection.user} /><div className="mt-5 flex gap-2 border-t border-border pt-4"><Button className="flex-1" size="sm" onClick={onMessage}><MessageCircle className="h-4 w-4" />Message</Button><Button variant="secondary" size="icon" onClick={onRemove} title="Remove connection"><UserMinus className="h-4 w-4" /></Button></div></Card>
}

function RequestCard({ connection, incoming = false, onAccept, onRemove }: { connection: Connection; incoming?: boolean; onAccept?: () => void; onRemove: () => void }) {
  return <Card className="p-4"><ProfileSummary user={connection.user} /><div className="mt-4 flex gap-2">{incoming ? <Button size="sm" onClick={onAccept}><Check className="h-4 w-4" />Accept</Button> : null}<Button size="sm" variant="secondary" onClick={onRemove}><X className="h-4 w-4" />{incoming ? 'Reject' : 'Cancel'}</Button></div></Card>
}

function SuggestionCard({ person, pending, onConnect }: { person: ConnectionSuggestion; pending: boolean; onConnect: () => void }) {
  return <Card className="p-4"><ProfileSummary user={person} /><SkillList user={person} highlighted={person.sharedSkills} /><div className="mt-5 border-t border-border pt-4"><Button className="w-full" size="sm" onClick={onConnect} disabled={pending}><UserPlus className="h-4 w-4" />{pending ? 'Sending' : 'Connect'}</Button></div></Card>
}

function RequestSection({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  return <section><h2 className="mb-3 font-display text-lg font-bold">{title}</h2><div className="space-y-3">{count ? children : <Card className="p-6 text-sm text-muted">{empty}</Card>}</div></section>
}
