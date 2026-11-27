/**
 * Interview video call page (/interviews/[id]/call).
 * Checks the interview ID, requires sign-in, and renders the call screen with a loading fallback.
 *
 * Calls: RequireAuth; CallScreen; CallLoading; positiveIntegerRouteParam
 * Used by:
 *   - Next.js router: page for /interviews/[id]/call
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { CallLoading } from '@/features/hiring-pipeline/components/interview-call/call-loading'
import { CallScreen } from '@/features/hiring-pipeline/components/interview-call/call-screen'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Interview call', robots: { index: false, follow: false } }

// Page /interviews/[id]/call — renders <CallScreen> (features/hiring-pipeline/components/interview-call/call-screen.tsx); while loading: <CallLoading> (sign-in required).
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
