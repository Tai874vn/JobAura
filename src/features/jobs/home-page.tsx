import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, Code2, Megaphone, Palette, Search } from 'lucide-react'
import { normalizeCategoriesResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, JobType } from '@/shared/schemas'
import { Button } from '@/shared/ui'

const fallbackCategories = [
  { id: 1, tenLoaiCongViec: 'Design', icon: Palette },
  { id: 2, tenLoaiCongViec: 'Development', icon: Code2 },
  { id: 3, tenLoaiCongViec: 'Marketing', icon: Megaphone },
  { id: 4, tenLoaiCongViec: 'Business', icon: BriefcaseBusiness },
]

export async function HomePage() {
  const typesRes = await serverRequest<ApiResponse<JobType[]>>('/api/categories', {
    includeCookies: false,
    next: { revalidate: 300 },
  })
  const categories = typesRes.ok ? (normalizeCategoriesResponse(typesRes.data).content ?? []) : []
  const displayed = (categories.length ? categories : fallbackCategories).slice(0, 8)

  return (
    <div>
      <section className="relative isolate min-h-[68vh] overflow-hidden bg-foreground text-white">
        <Image
          src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=2000&q=85"
          alt="Professionals collaborating around a table"
          fill
          priority
          className="object-cover object-center opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="container-page relative flex min-h-[68vh] items-center py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase text-accent">Work, talent, and professional community</p>
            <h1 className="mt-4 font-display text-5xl font-bold leading-tight sm:text-6xl">JobAura</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
              Discover opportunities, meet skilled people, and share the work that moves your career forward.
            </p>
            <form action="/jobs" className="mt-8 flex max-w-2xl rounded-lg bg-white p-2 text-foreground shadow-xl">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 shrink-0 text-muted" />
                <input name="keyword" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Search jobs, services, or skills" />
              </div>
              <Button size="lg">Search</Button>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/auth/register" className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-bold text-foreground hover:bg-white">
                Join JobAura <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/auth/login" className="inline-flex h-11 items-center rounded-lg border border-white/70 px-5 text-sm font-bold text-white hover:bg-white hover:text-foreground">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-white py-12">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold">Explore by expertise</h2>
              <p className="mt-1 text-sm text-muted">Go directly to the marketplace category you need.</p>
            </div>
            <Link href="/jobs" className="flex items-center gap-2 text-sm font-bold text-primary">Browse all jobs <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {displayed.map((category, index) => {
              const Icon = fallbackCategories[index % fallbackCategories.length].icon
              return (
                <Link key={category.id} href={`/jobs?category=${category.id}`} className="group bg-white p-5 hover:bg-surface-muted">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-8 font-display text-lg font-bold group-hover:text-primary">{category.tenLoaiCongViec}</p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
