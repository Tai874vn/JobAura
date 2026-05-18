import { notFound } from 'next/navigation'
import { ProfilePage } from '@/features/users/profile-page'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, User } from '@/shared/schemas'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const response = await serverRequest<ApiResponse<User>>(`/api/users/profile/${id}`)
  if (!response.ok || !response.data.content) notFound()
  return <ProfilePage user={response.data.content} />
}
