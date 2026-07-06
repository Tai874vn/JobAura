import { Suspense } from 'react'
import type { Metadata } from 'next'
import { JobListView } from '@/features/jobs/job-list-view'
import { Spinner } from '@/shared/ui'

export const metadata: Metadata = {
  title: 'Explore services',
  description: 'Search and compare freelance services, skills, pricing, ratings, and specialists on JobAura.',
  alternates: {
    canonical: '/jobs',
  },
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <JobListView />
    </Suspense>
  )
}
