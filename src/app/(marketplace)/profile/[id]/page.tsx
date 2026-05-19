import { notFound } from 'next/navigation'
import { ProfilePage } from '@/features/users/profile-page'
import { getUserPosts } from '@/features/users/profile-posts'
import { normalizeJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Job, UserProfile } from '@/shared/schemas'
import { Card, CardContent } from '@/shared/ui'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await serverRequest<ApiResponse<UserProfile>>(`/api/users/profile/${id}`)
  if (!response.ok) return <ProfileLoadError id={id} message={response.error} />
  if (!response.data.content) notFound()

  const jobsResponse = await serverRequest<ApiResponse<Job[]>>('/api/jobs')
  const jobs = jobsResponse.ok ? normalizeJobsResponse(jobsResponse.data).content ?? [] : []

  return <ProfilePage user={response.data.content} posts={getUserPosts(jobs, response.data.content.id)} />
}

function ProfileLoadError({ id, message }: { id: string; message: string | string[] }) {
  return (
    <div className="container-page py-10">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-danger">Profile unavailable</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Could not load profile #{id}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            The profile page is available, but the backend profile endpoint returned an error instead of profile data.
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-surface-muted p-4 text-xs text-muted">
            {Array.isArray(message) ? message.join('\n') : message}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
