/**
 * Loading fallback for the candidate portfolios page at /jobs. Shows the portfolio list skeleton while the page loads.
 *
 * Calls: JobsPageSkeleton
 * Used by:
 *   - Next.js router: loading for /jobs
 */

import { JobsPageSkeleton } from '@/features/jobs/components/browse/job-results-skeleton'

export default function Loading() {
  return <JobsPageSkeleton />
}
