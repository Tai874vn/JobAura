import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { normalizeCategoriesResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Category } from '@/shared/schemas'
import { categoryIcon } from '../category-icon'
import { Section, SectionHeading } from '@/shared/ui'

const fallbackCategories = ['Design', 'Development', 'Marketing', 'Business']

export async function CategoryGrid() {
  const typesRes = await serverRequest<ApiResponse<Category[]>>('/api/categories', {
    includeCookies: false,
    next: { revalidate: 300 },
  })
  const categories = typesRes.ok ? (normalizeCategoriesResponse(typesRes.data).content ?? []) : []
  const displayed = categories.length
    ? categories.slice(0, 8).map((category) => ({
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
          const Icon = categoryIcon(category.name)
          return (
            <Link
              key={category.key}
              href={category.href}
              className="group bg-surface p-5 transition hover:bg-surface-muted"
            >
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-8 font-display text-lg font-bold group-hover:text-primary">{category.name}</p>
            </Link>
          )
        })}
      </div>
    </Section>
  )
}
