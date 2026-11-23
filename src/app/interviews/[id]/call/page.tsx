import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RequireAuth } from '@/features/auth/require-auth'
import { CallScreen } from '@/features/hiring-pipeline/call-screen'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Interview call', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  return (
    <RequireAuth>
      <CallScreen interviewId={id} />
    </RequireAuth>
  )
}
