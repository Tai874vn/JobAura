import { Suspense } from 'react'
import { JobListView } from '@/features/jobs/job-list-view'
import { Spinner } from '@/shared/ui'

export const dynamic = 'force-dynamic'

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <JobListView />
    </Suspense>
  )
}
