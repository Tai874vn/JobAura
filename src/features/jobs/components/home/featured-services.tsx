import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Job, PaginatedContent } from '@/shared/schemas'
import { Section, SectionHeading } from '@/shared/ui'
import { JobCard } from '../browse/job-card'

export async function FeaturedServices() {
  const response = await serverRequest<ApiResponse<PaginatedContent<Job>>>(
    '/api/jobs/paginated-search?page=1&pageSize=8&sort=rating_desc',
    { includeCookies: false, next: { revalidate: 300 } }
  )
  const jobs = response.ok ? normalizePaginatedJobsResponse(response.data).content?.data ?? [] : []
  return (
    <Section id="services" tone="default">
      <SectionHeading
        title="Top-rated portfolios"
        description="Portfolio posts with the highest ratings"
        action={
          <Link
            href="/jobs?sort=rating_desc"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-strong"
          >
            Browse all portfolios <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {jobs.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        // Keep the section when the API is down or has no rated posts, so the page keeps its shape and says why.
        <p className="mt-8 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
          Top-rated portfolio posts appear here once posts have reviews.
        </p>
      )}
    </Section>
  )
}
