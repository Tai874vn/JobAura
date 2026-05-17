'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button, Card, CardContent, ListRowSkeleton } from '@/shared/ui'

export function MyPostsPage() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: queryKeys.jobs({ owner: user?.id }), queryFn: jobsApi.all, enabled: Boolean(user) })
  const deleteMutation = useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs({ owner: user?.id }) })
      toast.success('Service deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete service')),
  })
  const jobs = (query.data?.content ?? []).filter((job) => job.nguoiTao === user?.id)

  return (
    <div className="container-page py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">My posts</h1>
          <p className="mt-1 text-sm text-muted">Manage the services you sell on JobAura.</p>
        </div>
        <Link href="/jobs/new"><Button><Plus className="h-4 w-4" /> New service</Button></Link>
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
                <Link href={`/jobs/${job.id}`}><Button variant="secondary">View</Button></Link>
                <Button variant="danger" onClick={() => deleteMutation.mutate(job.id)}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!query.isPending && !jobs.length ? <Card><CardContent className="p-8 text-sm text-muted">You have not posted services yet.</CardContent></Card> : null}
      </div>
    </div>
  )
}
