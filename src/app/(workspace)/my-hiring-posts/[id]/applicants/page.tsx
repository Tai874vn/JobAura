/**
 * Applicants review page at /my-hiring-posts/[id]/applicants. Validates the hiring post ID from the URL and lets signed-in employers and admins review applicants for that post.
 *
 * Calls: positiveIntegerRouteParam; RequireAuth; ApplicantsPage; ApplicantsPageSkeleton
 * Used by:
 *   - Next.js router: page for /my-hiring-posts/[id]/applicants
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RequireAuth } from '@/features/auth/components/require-auth'
import { ApplicantsPage } from '@/features/hiring-pipeline/components/applicants/applicants-page'
import { ApplicantsPageSkeleton } from '@/features/hiring-pipeline/components/split-pane-skeletons'
import { positiveIntegerRouteParam } from '@/shared/lib/route-params'

export const metadata: Metadata = { title: 'Applicants' }

// Page /my-hiring-posts/[id]/applicants — renders <ApplicantsPage> (features/hiring-pipeline/components/applicants/applicants-page.tsx); while loading: <ApplicantsPageSkeleton> (sign-in required).
// Page settings: src/features/hiring-pipeline/config/applicants.ts
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const id = positiveIntegerRouteParam((await params).id)
  if (!id) notFound()
  return (
    <RequireAuth allowedRoles={['employer', 'admin']} fallback={<ApplicantsPageSkeleton />}>
      <Suspense fallback={<ApplicantsPageSkeleton />}>
        <ApplicantsPage postId={id} />
      </Suspense>
    </RequireAuth>
  )
}
