'use client'

import { ChevronDown, LayoutGrid } from 'lucide-react'
import { useId, useState } from 'react'
import type { Category } from '@/shared/schemas'
import { cn } from '@/shared/lib/utils'
import { Skeleton } from '@/shared/ui'
import { categoryIcon } from '../../utils/category-icon'

const COLLAPSED_LIMIT = 8

/**
 * Category chips shown in the Explore band of /jobs.
 * Keeps long lists short (first 8 plus the chosen category) behind an expandable Show more button.
 */
export function JobCategoryNav({
  categories,
  selectedId,
  loading,
  onSelect,
  className,
}: {
  categories: Category[]
  selectedId?: number
  loading: boolean
  onSelect: (categoryId?: number) => void
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const visible = expanded ? categories : categories.slice(0, COLLAPSED_LIMIT)
  const selected = categories.find((category) => category.id === selectedId)
  const items = selected && !visible.includes(selected) ? [...visible, selected] : visible
  const remaining = categories.length - items.length

  function chip(key: string, label: string, active: boolean, icon: React.ReactNode, onClick: () => void) {
    return (
      <button
        key={key}
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          'interaction inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          active
            ? 'border-[#123f32] bg-[#123f32] text-white'
            : 'border-[#d1ddd1] bg-surface text-muted hover:border-primary hover:text-primary',
        )}
      >
        <span className={cn('shrink-0', active ? 'text-white' : 'text-muted')}>{icon}</span>
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
      </button>
    )
  }

  return (
    <nav className={className} aria-label="Categories" aria-busy={loading}>
      <div id={listId} className="flex min-w-0 flex-wrap items-center gap-1.5">
        {chip('all', 'All', !selectedId, <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />, () => onSelect(undefined))}
        {items.map((category) => {
          const Icon = categoryIcon(category.name)
          const active = selectedId === category.id
          return chip(
            String(category.id),
            category.name,
            active,
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />,
            () => onSelect(active ? undefined : category.id),
          )
        })}
        {loading ? (
          <>
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </>
        ) : null}
      </div>

      {remaining > 0 || expanded ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 inline-flex items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {expanded ? 'Show less' : `Show more (${remaining})`}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
        </button>
      ) : null}
    </nav>
  )
}
