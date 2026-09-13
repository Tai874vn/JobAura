import Link from 'next/link'
import {
  ArrowRight,
  AudioLines,
  BarChart3,
  BriefcaseBusiness,
  Clapperboard,
  Code2,
  Megaphone,
  Palette,
  PenLine,
  Shapes,
} from 'lucide-react'
import { normalizeCategoriesResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, JobType } from '@/shared/schemas'
import { Section, SectionHeading } from '@/shared/ui'

const fallbackCategories: Array<{ id: number; tenLoaiCongViec: string }> = [
  { id: 1, tenLoaiCongViec: 'Design' },
  { id: 2, tenLoaiCongViec: 'Development' },
  { id: 3, tenLoaiCongViec: 'Marketing' },
  { id: 4, tenLoaiCongViec: 'Business' },
]

function categoryIcon(name: string) {
  const value = name.toLowerCase()
  if (/(design|graphic|illustrat|thi.?t k|ui\b|ux\b)/.test(value)) return Palette
  if (/(develop|program|cod(e|ing)|software|web|app|tech|l?p tr|phat tri)/.test(value)) return Code2
  if (/(market|seo|advertis|social|promot|ti?p th)/.test(value)) return Megaphone
  if (/(business|finance|account|legal|consult|kinh doanh)/.test(value)) return BriefcaseBusiness
  if (/(video|film|animat|motion)/.test(value)) return Clapperboard
  if (/(writ|translat|content|copy)/.test(value)) return PenLine
  if (/(music|audio|voice|sound)/.test(value)) return AudioLines
  if (/(data|analytics|research|admin)/.test(value)) return BarChart3
  return Shapes
}

export async function CategoryGrid() {
  const typesRes = await serverRequest<ApiResponse<JobType[]>>('/api/categories', {
    includeCookies: false,
    next: { revalidate: 300 },
  })
  const categories = typesRes.ok ? (normalizeCategoriesResponse(typesRes.data).content ?? []) : []
  const displayed = (categories.length ? categories : fallbackCategories).slice(0, 8)

  return (
    <Section id="categories" tone="default">
      <SectionHeading
        eyebrow="Marketplace"
        title="Explore by expertise"
        description="Go directly to the marketplace category you need."
        action={
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary transition hover:text-primary-bright"
          >
            Browse all jobs <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {displayed.map((category) => {
          const Icon = categoryIcon(category.tenLoaiCongViec)
          return (
            <Link
              key={category.id}
              href={`/jobs?category=${category.id}`}
              className="group bg-surface p-5 transition hover:bg-surface-muted"
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-8 font-display text-lg font-bold group-hover:text-primary">{category.tenLoaiCongViec}</p>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}
