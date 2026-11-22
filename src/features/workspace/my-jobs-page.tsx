'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock3, Hash, SearchX, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { hiresApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { currency, getErrorMessage } from '@/shared/lib/utils'
import { Badge, Button, ButtonLink, Card, ConfirmationDialog, EmptyState, ListRowSkeleton } from '@/shared/ui'

export function MyJobsPage() {
  const queryClient = useQueryClient()
  const [pendingRemove, setPendingRemove] = useState<number | null>(null)
  const query = useQuery({ queryKey: queryKeys.hires, queryFn: hiresApi.mine })
  const completeMutation = useMutation({
    mutationFn: hiresApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hires })
      toast.success('Marked as complete')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to complete job')),
  })
  const deleteMutation = useMutation({
    mutationFn: hiresApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hires })
      setPendingRemove(null)
      toast.success('Removed hired job')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to remove hired job')),
  })
  const jobs = query.data?.content ?? []
  const inProgress = jobs.filter((item) => !item.completed).length
  const completed = jobs.length - inProgress
  const totalValue = jobs.reduce((sum, item) => sum + (item.job?.price ?? 0), 0)

  return (
    <div className="container-page pt-10 pb-16">
      <p className="text-xs font-medium text-primary">Buyer workspace</p>
      <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight">My hired jobs</h1>

      {jobs.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Hired jobs summary">
          <div className="rounded-lg border border-border bg-surface p-3.5">
            <b className="block font-display text-[22px] font-medium leading-tight">{inProgress}</b>
            <span className="text-xs font-medium text-muted">In progress</span>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3.5">
            <b className="block font-display text-[22px] font-medium leading-tight">{completed}</b>
            <span className="text-xs font-medium text-muted">Completed</span>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3.5">
            <b className="block font-display text-[22px] font-medium leading-tight">{currency(totalValue)}</b>
            <span className="text-xs font-medium text-muted">Total hired value</span>
          </div>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3" aria-busy={query.isPending} aria-live="polite">
        {query.isPending ? Array.from({ length: 3 }).map((_, index) => <ListRowSkeleton key={index} />) : jobs.map((item) => (
          <Card key={item.id} className="flex flex-wrap items-center gap-4 p-3.5 transition hover:border-primary hover:shadow-float">
            <div className="min-w-48 flex-1">
              <Badge tone={item.completed ? 'primary' : 'neutral'}>
                {item.completed ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <Clock3 className="mr-1 h-3 w-3" />}
                {item.completed ? 'Completed' : 'In progress'}
              </Badge>
              <h2 className="mt-1.5 text-[15px] font-medium leading-snug">
                <a href={`/jobs/${item.jobId}`} className="hover:text-primary">{item.job?.title ?? `Job #${item.jobId}`}</a>
              </h2>
              <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs font-medium text-muted">
                <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {currency(item.job?.price)}</span>
                <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" /> Job #{item.jobId}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <ButtonLink href={`/jobs/${item.jobId}`} variant="secondary" size="sm">View</ButtonLink>
              <Button
                variant="secondary"
                size="sm"
                loading={completeMutation.isPending && completeMutation.variables === item.id}
                disabled={item.completed || (completeMutation.isPending && completeMutation.variables === item.id)}
                onClick={() => completeMutation.mutate(item.id)}
              >
                <CheckCircle2 className="h-4 w-4" /> {item.completed ? 'Completed' : 'Complete'}
              </Button>
              <Button variant="danger" size="sm" onClick={() => setPendingRemove(item.id)}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          </Card>
        ))}
        {query.isError ? (
          <EmptyState
            icon={<SearchX />}
            title="Hired jobs could not be loaded"
            description="Check the backend connection and try again."
            action={<Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>}
          />
        ) : null}
        {!query.isPending && !query.isError && !jobs.length ? (
          <EmptyState
            icon={<SearchX />}
            title="No hired jobs yet"
            description="Everything you hire from Explore shows up here."
            action={<ButtonLink href="/jobs">Explore services</ButtonLink>}
          />
        ) : null}
      </div>
      <ConfirmationDialog
        open={pendingRemove !== null}
        title="Remove this hired job?"
        description="The hired-job record will be permanently removed. This action cannot be undone."
        confirmLabel="Remove hired job"
        pending={deleteMutation.isPending}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove !== null) deleteMutation.mutate(pendingRemove)
        }}
      />
    </div>
  )
}
