'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import Link from 'next/link'
import { Plus, SearchX, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { cn, getErrorMessage, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { servicePriceLabel } from '@/features/jobs/service-price'
import type { Job } from '@/shared/schemas'
import { Button, ButtonLink, Card, ConfirmationDialog, EmptyState, ListRowSkeleton } from '@/shared/ui'

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
    <div className="container-page pt-10 pb-16">
      <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Seller workspace</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">My portfolio posts</h1>
        </div>
        <ButtonLink href="/jobs/new">
          <Plus className="h-4 w-4" /> New service
        </ButtonLink>
      </div>

      <div className="mt-6 grid gap-3" aria-busy={query.isPending} aria-live="polite">
        {query.isPending ? Array.from({ length: 3 }).map((_, index) => <ListRowSkeleton key={index} />) : jobs.map((job) => (
          <MyPostRow key={job.id} job={job} onDelete={() => setPendingDelete({ id: job.id, title: job.title })} />
        ))}
        {query.isError ? (
          <EmptyState
            icon={<SearchX />}
            title="Services could not be loaded"
            description="Check the backend connection and try again."
            action={<Button variant="secondary" onClick={() => query.refetch()}>Retry</Button>}
          />
        ) : null}
        {!query.isPending && !query.isError && !jobs.length ? (
          <EmptyState
            icon={<Plus />}
            title="No portfolio posts yet"
            description="Publish your first one; recruiters find it in Portfolios and on your profile."
            action={<ButtonLink href="/jobs/new">Post your portfolio</ButtonLink>}
          />
        ) : null}
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

function MyPostRow({ job, onDelete }: { job: Job; onDelete: () => void }) {
  const imageUrl = resolveAssetUrl(job.image)
  const bypassOptimizer = shouldBypassImageOptimizer(job.image)
  const hasRating = (job.rating ?? 0) > 0

  return (
    <Card className="flex flex-wrap items-center gap-4 p-3.5 transition hover:border-primary hover:shadow-[0_8px_24px_rgba(27,28,28,0.06)]">
      <span className="relative block h-[63px] w-[84px] shrink-0 overflow-hidden rounded-lg bg-surface-muted">
        {imageUrl ? (
          <Image src={imageUrl} alt={job.title} fill unoptimized={bypassOptimizer} className="object-cover" sizes="84px" />
        ) : (
          <span className="flex h-full items-center justify-center font-display text-xl font-bold text-primary/30">JA</span>
        )}
      </span>
      <div className="min-w-48 flex-1">
        <h2 className="text-[15px] font-bold leading-snug">
          <Link href={`/jobs/${job.id}`} className="hover:text-primary">{job.title}</Link>
        </h2>
        <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs font-semibold text-muted">
          <span className="inline-flex items-center gap-1">
            <Star className={cn('h-3 w-3', hasRating ? 'fill-rating text-rating' : 'text-muted')} />
            {hasRating ? `${(job.rating ?? 0).toFixed(1)}` : 'New · no reviews yet'}
          </span>
          <span>{servicePriceLabel(job.price) ?? 'Portfolio'}</span>
          {job.subcategory?.name ? <span>{job.subcategory.name}</span> : null}
        </div>
      </div>
      <div className="flex gap-2">
        <ButtonLink href={`/jobs/${job.id}`} variant="secondary" size="sm">View</ButtonLink>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </Card>
  )
}
