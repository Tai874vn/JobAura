import { notFound } from 'next/navigation'
import { JobDetailView } from '@/features/jobs/job-detail-view'
import { normalizeJobResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Comment, Job } from '@/shared/schemas'

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await serverRequest<ApiResponse<Job & { binhLuans?: Comment[] }>>(`/api/jobs/details/${id}`)
  const job = response.ok ? normalizeJobResponse(response.data).content : null
  if (!job) notFound()
  return <JobDetailView job={job} comments={job.binhLuans ?? []} />
}
