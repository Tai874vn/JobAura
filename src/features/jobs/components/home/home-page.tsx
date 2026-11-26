import { welcomeConfig } from '@/page-config/welcome'
import { Suspense } from 'react'
import { FaqSection } from './faq'
import { FeaturedServicesSkeleton, CategoryGridSkeleton } from './home-skeletons'
import Link from 'next/link'
import { ArrowRight, Search, Check } from 'lucide-react'
import { Section, ButtonLink, SectionHeading, Button } from '@/shared/ui'
import { normalizeCategoriesResponse, normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Category, Job, PaginatedContent } from '@/shared/schemas'
import { categoryIcon } from '@/features/jobs/utils/category-icon'
import { JobCard } from '@/features/jobs/components/browse/job-card'
import { ShortlistPreview } from '@/features/jobs/components/home/shortlist-preview'
import { MatchScore } from '@/features/jobs/components/recommendations/recommendation-ui'
import { sampleBreakdown, sampleCandidates, samplePost } from '@/features/jobs/utils/home/sample-shortlist'

export function HomePage() {
  return (
    <div>
      <LandingHero />
      <ScoreBreakdown />
      <HowItWorks />
      <BrowseSection />
      {/* Stream top-rated portfolios inside Suspense (async server boundary) so static sections paint immediately. */}
      <Suspense fallback={<FeaturedServicesSkeleton />}>
        <FeaturedServices />
      </Suspense>
      <FaqSection />
      <CtaBand />
    </div>
  )
}

/** One place to start browsing: open roles for candidates, portfolio posts for recruiters. */
export function BrowseSection() {
  return (
    <Section id="browse" tone="surface" className="border-y border-border">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-medium">Open roles by occupation</h2>
          <p className="mt-2 text-sm text-muted">Hiring posts are tagged with an ESCO occupation</p>
          <div className="mt-6">
            <OccupationLinks />
          </div>
          <BrowseLink href="/hiring-posts">All hiring posts</BrowseLink>
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-medium">Portfolios by expertise</h2>
          <p className="mt-2 text-sm text-muted">Candidates’ work, grouped by specialty</p>
          <div className="mt-6">
            {/* Stream categories independently so the static landing hero paints right away. */}
            <Suspense fallback={<CategoryGridSkeleton />}>
              <CategoryGrid />
            </Suspense>
          </div>
          <BrowseLink href="/jobs">All portfolios</BrowseLink>
        </div>
      </div>
    </Section>
  )
}

function BrowseLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary-strong">
      {children} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

const fallbackCategories = ['Design', 'Development', 'Marketing', 'Business']

/** Portfolio posts by expertise; the other half of the landing's browse block. */
export async function CategoryGrid() {
  const typesRes = await serverRequest<ApiResponse<Category[]>>('/api/categories', {
    includeCookies: false,
    next: { revalidate: 300 },
  })
  const categories = typesRes.ok ? (normalizeCategoriesResponse(typesRes.data).content ?? []) : []
  // Without the API there are no real IDs, so the fallback searches by name instead of inventing IDs.
  const displayed = categories.length
    ? categories.slice(0, welcomeConfig.categoriesShown).map((category) => ({
        key: String(category.id),
        name: category.name,
        href: `/jobs?category=${category.id}`,
      }))
    : fallbackCategories.map((name) => ({
        key: name,
        name,
        href: `/jobs?keyword=${encodeURIComponent(name)}`,
      }))

  return (
    <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
      {displayed.map((category) => {
        const Icon = categoryIcon(category.name)
        return (
          <li key={category.key} className="border-b border-border">
            <Link
              href={category.href}
              className="flex min-h-11 items-center gap-3 py-2 text-sm transition-colors hover:text-primary"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.5} aria-hidden="true" />
              {category.name}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

// Occupation names follow ESCO, the EU's standard list of jobs that hiring posts are tagged with.
const occupations = [
  'Software developer',
  'Web developer',
  'Data analyst',
  'Database designer',
  'Graphic designer',
  'Marketing manager',
  'Accountant',
  'Sales representative',
]

/** Open roles by occupation; one half of the landing's browse block. */
export function OccupationLinks() {
  return (
    <ul className="flex flex-wrap gap-2">
      {occupations.map((occupation) => (
        <li key={occupation}>
          <Link
            href={`/hiring-posts?keyword=${encodeURIComponent(occupation)}`}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm text-muted transition-colors hover:border-primary/40 hover:text-primary sm:min-h-9"
          >
            {occupation}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function CtaBand() {
  return (
    <Section tone="primary">
      <div className="flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-2xl font-display text-3xl font-medium text-white sm:text-4xl">Apply to a role or post one today</h2>
        <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base">
          A free account lets you apply to roles, post your portfolio, or publish hiring posts
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/auth/register" variant="accent" size="lg">
            Join JobAura <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink
            href="/auth/login"
            variant="secondary"
            size="lg"
            className="border-white/70 bg-transparent text-white hover:border-white hover:bg-white hover:text-foreground"
          >
            Sign in
          </ButtonLink>
        </div>
      </div>
    </Section>
  )
}

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

export function LandingHero() {
  return (
    <section className="border-b border-border bg-background">
      <div className="container-page grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-24">
        <div className="min-w-0 max-w-xl">
          <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-[-0.02em] sm:text-6xl sm:tracking-[-0.03em]">
            Find your next role, or the right person for it
          </h1>
          <p className="mt-5 text-lg leading-8 text-muted">
            Candidates apply to open roles and post their portfolio. Recruiters publish a role and get candidates ranked by
            occupation, years in it, skills, and level.
          </p>
          <form action="/hiring-posts" role="search" className="field-shell mt-8 flex rounded-xl border border-border bg-surface p-1.5 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                name="keyword"
                aria-label="Search roles, skills, or companies"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder={welcomeConfig.searchPlaceholder}
              />
            </div>
            <Button size="lg" type="submit" className="h-11">
              Search roles
            </Button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <span>Hiring?</span>
            <ButtonLink href="/auth/register?role=employer" variant="secondary">
              Post a role <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>

        <ShortlistPreview />
      </div>
    </section>
  )
}

// One sequence for both sides of a hire; the order is the information, so the steps stay numbered.
const steps = [
  {
    title: 'Post or find a role',
    candidate: 'Search open roles by occupation, level, and location.',
    recruiter: 'Publish a role with its occupation, years, and skills.',
  },
  {
    title: 'Let the resume speak',
    candidate: 'Add a resume; your level is read from the work you describe.',
    recruiter: 'See each applicant’s occupation, years, and level.',
  },
  {
    title: 'Match, save, and talk',
    candidate: 'See the roles that fit you and the skills you still need.',
    recruiter: 'Get a ranked shortlist and message candidates in real time.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="default">
      <SectionHeading title="How it works" description="The same three steps for candidates and recruiters" />
      <ol className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step, index) => (
          <li key={step.title} className="min-w-0 border-t border-foreground/15 pt-5">
            <p className="font-mono text-xs tabular-nums text-muted">Step {index + 1}</p>
            <h3 className="mt-2 font-display text-lg font-medium">{step.title}</h3>
            <dl className="mt-4 grid gap-3 text-sm leading-6">
              <div>
                <dt className="font-medium">Candidates</dt>
                <dd className="text-muted">{step.candidate}</dd>
              </div>
              <div>
                <dt className="font-medium">Recruiters</dt>
                <dd className="text-muted">{step.recruiter}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </Section>
  )
}

/** Opens up the top row of the hero shortlist: what each requirement asked for and what the resume showed. */
export function ScoreBreakdown() {
  const top = sampleCandidates[0]
  return (
    <Section id="ranking" tone="surface" className="border-b border-border">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="min-w-0 max-w-md">
          <h2 className="font-display text-3xl font-medium">Why {top.name.split(' ').at(-1)} ranks first</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            Every candidate is compared with the hiring post on the same four points. Occupations come from ESCO, the EU’s
            standard list of jobs, years count time in that occupation, and the level is read from the work described in the resume.
          </p>
          <p className="mt-4 text-base leading-7 text-muted">
            Recruiters see the matched and missing skills next to each score, and candidates see which skills they still need.
          </p>
        </div>

        <figure aria-label="Example score breakdown for the top candidate" className="min-w-0 rounded-2xl border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-4 py-5 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs text-muted">{samplePost.title} · Example</p>
              <p className="mt-1 font-display text-lg font-medium">{top.name}</p>
            </div>
            <MatchScore score={top.score} label="high_match" className="[&>span:first-child]:text-xl" />
          </div>
          <dl className="divide-y divide-border">
            {sampleBreakdown.map((row) => (
              <div key={row.factor} className="grid grid-cols-1 gap-x-6 gap-y-1 px-4 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:px-6">
                <dt className="text-sm text-muted">
                  {row.factor}
                  <span className="block text-xs">Asks for {row.required}</span>
                </dt>
                <dd className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  <span className="min-w-0">{row.found}</span>
                </dd>
              </div>
            ))}
          </dl>
        </figure>
      </div>
    </Section>
  )
}
