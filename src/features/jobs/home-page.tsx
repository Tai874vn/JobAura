import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Code2, Megaphone, Palette, Search, Star } from 'lucide-react'
import { JobCard } from './job-card'
import { normalizeCategoriesResponse, normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Job, JobType, PaginatedContent, UserProfile } from '@/shared/schemas'
import { Button, Card, CardContent } from '@/shared/ui'

const categories = [
  { label: 'Graphics', icon: Palette },
  { label: 'Marketing', icon: Megaphone },
  { label: 'Writing', icon: BriefcaseBusiness },
  { label: 'Tech', icon: Code2 },
]

export async function HomePage() {
  const [jobsRes, typesRes] = await Promise.all([
    serverRequest<ApiResponse<PaginatedContent<Job>>>('/api/jobs/paginated-search?page=1&pageSize=8', {
      includeCookies: false,
      next: { revalidate: 60 },
    }),
    serverRequest<ApiResponse<JobType[]>>('/api/categories', {
      includeCookies: false,
      next: { revalidate: 300 },
    }),
  ])
  const jobs = jobsRes.ok ? await withSellerProfiles(normalizePaginatedJobsResponse(jobsRes.data).content?.data ?? []) : []
  const jobTypes = typesRes.ok ? (normalizeCategoriesResponse(typesRes.data).content ?? []) : []

  return (
    <div>
      <section className="border-b border-border bg-background">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-primary">Trusted freelance services</p>
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-6xl">
              Find the perfect freelance services for your business.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Discover vetted experts, compare services quickly, and move from search to hiring without losing momentum.
            </p>
            <form action="/jobs" className="mt-8 flex max-w-2xl rounded-lg border border-border bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
              <div className="flex flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 text-muted" />
                <input name="keyword" className="h-12 flex-1 bg-transparent text-sm outline-none" placeholder="Search logo design, NestJS, writing..." />
              </div>
              <Button size="lg">Search</Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-2">
              {(jobTypes.length ? jobTypes : categories.map((item, index) => ({ id: index, tenLoaiCongViec: item.label }))).slice(0, 8).map((type) => (
                <Link key={type.id} href={`/jobs?category=${type.id}`} className="rounded border border-border bg-white px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                  {type.tenLoaiCongViec}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-4">
            <Card className="bg-white">
              <CardContent className="grid grid-cols-3 gap-4 p-5">
                {[
                  ['50M+', 'Projects'],
                  ['10M+', 'Freelancers'],
                  ['4.9/5', 'Avg rating'],
                ].map(([value, label]) => (
                  <div key={label}>
                    <p className="font-display text-3xl font-bold">{value}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              {categories.map(({ label, icon: Icon }) => (
                <Card key={label} className="p-5">
                  <Icon className="mb-8 h-6 w-6 text-primary" />
                  <h3 className="font-display text-xl font-bold">{label}</h3>
                  <p className="mt-1 text-sm text-muted">Browse qualified services</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Featured services</h2>
            <p className="text-sm text-muted">Fresh services from JobAura sellers.</p>
          </div>
          <Link href="/jobs" className="hidden items-center gap-2 text-sm font-bold text-primary md:flex">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {jobs.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {jobs.map((job, index) => (
              <JobCard key={job.id} job={job} priority={index < 4} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 p-8">
              <Star className="h-5 w-5 text-rating" />
              <p className="text-sm text-muted">Featured services are being curated. Check back soon for new opportunities.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

async function withSellerProfiles(jobs: Job[]) {
  const sellerIds = [
    ...new Set(
      jobs
        .filter((job) => !job.nguoiDung?.name && job.nguoiTao)
        .map((job) => Number(job.nguoiTao))
    ),
  ]

  if (!sellerIds.length) return jobs

  const sellers = new Map<number, Job['nguoiDung']>()
  const responses = await Promise.all(
    sellerIds.map(async (sellerId) => {
      const response = await serverRequest<ApiResponse<UserProfile>>(`/api/users/profile/${sellerId}`, {
        includeCookies: false,
        next: { revalidate: 60 },
      })
      return { sellerId, response }
    })
  )

  for (const { sellerId, response } of responses) {
    const profile = response.ok ? response.data.content : null
    if (profile) sellers.set(sellerId, { id: profile.id, name: profile.name, avatar: profile.avatar })
  }

  return jobs.map((job) => {
    if (job.nguoiDung?.name || !job.nguoiTao) return job
    return { ...job, nguoiDung: sellers.get(job.nguoiTao) ?? job.nguoiDung }
  })
}
