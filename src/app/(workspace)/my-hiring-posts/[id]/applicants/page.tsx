import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequireAuth } from '@/features/auth/require-auth'
import { ApplicantsPage } from '@/features/hiring-pipeline/applicants-page'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Applicants' }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  return (
    <RequireAuth allowedRoles={['employer', 'admin']}>
      <ApplicantsPage postId={id} />
    </RequireAuth>
  )
}
