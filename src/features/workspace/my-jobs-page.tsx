'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { hiredJobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { currency, getErrorMessage } from '@/shared/lib/utils'
import { Badge, Button, ButtonLink, Card, CardContent, ListRowSkeleton } from '@/shared/ui'

export function MyJobsPage() {
  const queryClient = useQueryClient()
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
      toast.success('Removed hired job')
    },
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
                <Button variant="secondary" onClick={() => completeMutation.mutate(item.id)}><CheckCircle2 className="h-4 w-4" /> Complete</Button>
                <Button variant="danger" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /> Remove</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!query.isPending && !jobs.length ? <Card><CardContent className="p-8 text-sm text-muted">No hired jobs yet.</CardContent></Card> : null}
      </div>
    </div>
  )
}
