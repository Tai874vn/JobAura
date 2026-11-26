import Link from 'next/link'
import { normalizeCategoriesResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import type { ApiResponse, Category } from '@/shared/schemas'
import { categoryIcon } from '../../utils/category-icon'

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
