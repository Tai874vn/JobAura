import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/require-auth'
import { CallLoading } from '@/features/hiring-pipeline/call-loading'
import { CallScreen } from '@/features/hiring-pipeline/call-screen'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Interview call', robots: { index: false, follow: false } }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  return (
    <RequireAuth fallback={<CallLoading />}>
      <Suspense fallback={<CallLoading />}>
        <CallScreen interviewId={id} />
      </Suspense>
    </RequireAuth>
  )
}
