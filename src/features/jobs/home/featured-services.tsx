import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Job, PaginatedContent } from '@/shared/schemas'
import { Section, SectionHeading } from '@/shared/ui'
import { JobCard } from '../job-card'

export async function FeaturedServices() {
  const response = await serverRequest<ApiResponse<PaginatedContent<Job>>>(
    '/api/jobs/paginated-search?page=1&pageSize=8&sort=rating_desc',
    { includeCookies: false, next: { revalidate: 300 } }
  )
  const jobs = response.ok ? normalizePaginatedJobsResponse(response.data).content?.data ?? [] : []
  if (!jobs.length) return null

  return (
    <Section id="services" tone="surface">
      <SectionHeading
        title="Popular right now"
        description="Top-rated services from JobAura specialists."
        action={
          <Link
            href="/jobs?sort=rating_desc"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:text-primary-bright"
          >
            Browse all services <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </Section>
  )
}
