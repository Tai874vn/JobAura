'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { hiredJobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { currency, getErrorMessage } from '@/shared/lib/utils'
import { Badge, Button, ButtonLink, Card, CardContent, ConfirmationDialog, ListRowSkeleton } from '@/shared/ui'

export function MyJobsPage() {
  const queryClient = useQueryClient()
  const [pendingRemove, setPendingRemove] = useState<number | null>(null)
  const query = useQuery({ queryKey: queryKeys.hiredJobs, queryFn: hiredJobsApi.mine })
  const completeMutation = useMutation({
    mutationFn: hiredJobsApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hiredJobs })
      toast.success('Marked as complete')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to complete job')),
  })
  const deleteMutation = useMutation({
    mutationFn: hiredJobsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hiredJobs })
      setPendingRemove(null)
      toast.success('Removed hired job')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to remove hired job')),
  })
  const jobs = query.data?.content ?? []

  return (
    <div className="container-page py-8">
      <h1 className="font-display text-4xl font-bold">My hired jobs</h1>
      <p className="mt-1 text-sm text-muted">Track services you have hired.</p>
      <div className="mt-6 grid gap-4">
        {query.isPending ? Array.from({ length: 3 }).map((_, index) => <ListRowSkeleton key={index} />) : jobs.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Badge tone={item.hoanThanh ? 'primary' : 'neutral'}>{item.hoanThanh ? 'Completed' : 'In progress'}</Badge>
                <h2 className="mt-2 font-display text-xl font-bold">{item.congViec?.tenCongViec ?? `Job #${item.maCongViec}`}</h2>
                <p className="text-sm text-muted">{currency(item.congViec?.giaTien)}</p>
              </div>
              <div className="flex gap-2">
                <ButtonLink href={`/jobs/${item.maCongViec}`} variant="secondary">View</ButtonLink>
                <Button
                  variant="secondary"
                  disabled={item.hoanThanh || (completeMutation.isPending && completeMutation.variables === item.id)}
                  onClick={() => completeMutation.mutate(item.id)}
                >
                  <CheckCircle2 className="h-4 w-4" /> {item.hoanThanh ? 'Completed' : 'Complete'}
                </Button>
                <Button variant="danger" onClick={() => setPendingRemove(item.id)}><Trash2 className="h-4 w-4" /> Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {query.isError ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted">Hired jobs could not be loaded.<Button className="mx-auto mt-3" variant="secondary" onClick={() => query.refetch()}>Retry</Button></CardContent></Card>
        ) : null}
        {!query.isPending && !query.isError && !jobs.length ? <Card><CardContent className="p-8 text-sm text-muted">No hired jobs yet.</CardContent></Card> : null}
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
