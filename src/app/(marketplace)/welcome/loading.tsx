/**
 * Loading fallback for the public landing page at /welcome. Shows the welcome page skeleton while the page loads.
 *
 * Calls: WelcomePageSkeleton
 * Used by:
 *   - Next.js router: loading for /welcome
 */

import { WelcomePageSkeleton } from '@/features/jobs/components/home/home-skeletons'

export default function Loading() {
  return <WelcomePageSkeleton />
}
