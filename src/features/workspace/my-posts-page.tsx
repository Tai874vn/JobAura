'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, Card, CardContent, ConfirmationDialog, ListRowSkeleton } from '@/shared/ui'

export function MyPostsPage() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const [pendingDelete, setPendingDelete] = useState<{ id: number; title: string } | null>(null)
  const params = { page: 1, pageSize: 50 }
  const query = useQuery({
    queryKey: queryKeys.jobsByCreator(user?.id ?? 0, params),
    queryFn: () => jobsApi.byCreator(user!.id, params),
    enabled: Boolean(user),
  })
  const deleteMutation = useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'creator', user?.id] })
      setPendingDelete(null)
      toast.success('Service deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete service')),
  })
  const jobs = query.data?.content?.data ?? []

  return (
    <div className="container-page py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">My posts</h1>
          <p className="mt-1 text-sm text-muted">Manage the services you sell on JobAura.</p>
        </div>
        <ButtonLink href="/jobs/new"><Plus className="h-4 w-4" /> New service</ButtonLink>
      </div>
      <div className="mt-6 grid gap-4">
        {query.isPending ? Array.from({ length: 3 }).map((_, index) => <ListRowSkeleton key={index} />) : jobs.map((job) => (
          <Card key={job.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold">{job.tenCongViec}</h2>
                <p className="text-sm text-muted">Rating {(job.saoCongViec ?? 0).toFixed(1)} · ${job.giaTien}</p>
              </div>
              <div className="flex gap-2">
                <ButtonLink href={`/jobs/${job.id}`} variant="secondary">View</ButtonLink>
                <Button variant="danger" onClick={() => setPendingDelete({ id: job.id, title: job.tenCongViec })}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {query.isError ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted">Services could not be loaded.<Button className="mx-auto mt-3" variant="secondary" onClick={() => query.refetch()}>Retry</Button></CardContent></Card>
        ) : null}
        {!query.isPending && !query.isError && !jobs.length ? <Card><CardContent className="p-8 text-sm text-muted">You have not posted services yet.</CardContent></Card> : null}
      </div>
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title="Delete this service?"
        description={`“${pendingDelete?.title ?? ''}” will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete service"
        pending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id)
        }}
      />
    </div>
  )
}
