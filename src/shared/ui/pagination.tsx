import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

/** The pages to show as numbers: the first, the last, and the ones next to the current page. */
export function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
}

/** Previous / numbered pages / next. Renders nothing when everything fits on one page. */
export function Pagination({
  page,
  totalPages,
  onPage,
  label = 'Pages',
  boxed = false,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
  label?: string
  /** White bordered buttons, for lists on a tinted page. */
  boxed?: boolean
}) {
  const idle = boxed ? 'secondary' : 'ghost'
  if (totalPages <= 1) return null
  const pages = pageWindow(page, totalPages)
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label={label}>
      <Button type="button" variant={idle} size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}
        aria-label="Previous page">
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>
      {pages.map((number, index) => (
        <span key={number} className="flex items-center gap-1.5">
          {index > 0 && number - pages[index - 1] > 1 ? <span className="px-1 text-sm text-muted" aria-hidden="true">…</span> : null}
          <Button type="button" size="sm" className="min-w-9 tabular-nums" variant={number === page ? 'primary' : idle}
            aria-current={number === page ? 'page' : undefined} aria-label={`Page ${number}`} onClick={() => onPage(number)}>
            {number}
          </Button>
        </span>
      ))}
      <Button type="button" variant={idle} size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        aria-label="Next page">
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}
