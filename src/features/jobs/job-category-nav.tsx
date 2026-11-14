'use client'

import Link from 'next/link'
import { useId, useState } from 'react'
import { ChevronDown, LayoutGrid } from 'lucide-react'
import type { Category } from '@/shared/schemas'
import { cn } from '@/shared/lib/utils'
import { Button, Skeleton } from '@/shared/ui'
import { categoryIcon } from './category-icon'

export function JobCategoryNav({ categories, selectedId, loading, navigate }: {
  categories: Category[]; selectedId?: number; loading: boolean; navigate: (href: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const visible = expanded ? categories : categories.slice(0, 8)
  const selected = categories.find((category) => category.id === selectedId)
  const items = selected && !visible.includes(selected) ? [...visible, selected] : visible
  const remaining = categories.length - items.length

  function chip(href: string, label: string, active: boolean, icon: React.ReactNode) {
    return <Link key={href} href={href} onNavigate={(event) => { event.preventDefault(); navigate(href) }}
      aria-current={active ? 'page' : undefined}
      className={cn('interaction inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright',
        active ? 'border-foreground bg-foreground text-white' : 'border-border bg-surface text-muted hover:border-primary hover:text-primary')}>
      <span className={cn('shrink-0', active ? 'text-accent' : 'text-primary')}>{icon}</span>
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{label}</span>
    </Link>
  }

  return <nav className="container-page mt-6" aria-label="Categories" aria-busy={loading}>
    <div id={id} className="flex min-w-0 flex-wrap items-center gap-2">
      {chip('/jobs', 'All', !selectedId, <LayoutGrid className="h-3.5 w-3.5" />)}
      {items.map((category) => {
        const Icon = categoryIcon(category.name)
        return chip(`/jobs?category=${category.id}`, category.name, selectedId === category.id, <Icon className="h-3.5 w-3.5" />)
      })}
      {loading ? <><Skeleton className="h-9 w-28 rounded-full" /><Skeleton className="h-9 w-32 rounded-full" /></> : null}
    </div>
    {remaining > 0 || expanded ? <Button type="button" variant="ghost" size="sm" className="mt-2" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded((value) => !value)}>
      {expanded ? 'Show less' : `Show more (${remaining})`}
      <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
    </Button> : null}
  </nav>
}
