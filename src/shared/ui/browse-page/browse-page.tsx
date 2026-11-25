'use client'

import { Check, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

/**
 * The browse layout of /hiring-posts, shared by the pages that look like it: a hero, a search bar that stays under
 * the site header while the page scrolls, an optional "Explore:" row (left out, nothing is drawn for it), a filter column on the left (shown by a
 * button on phones), and the results on the right with their header, list and pagination.
 *
 * When `resultsKey` changes (a search, a filter, another page) and `resultsReady` is true, the results go back to
 * their top if the reader had scrolled past it.
 */
export function BrowsePage({ hero, search, explore, filters, filtersOpen, toolbar, results, pagination, resultsKey, resultsReady }: {
  hero: ReactNode
  /** The search form; the sticky band around it comes from here. */
  search: ReactNode
  explore?: ReactNode
  /** The filter column. On phones it shows only while `filtersOpen` is true. */
  filters: ReactNode
  filtersOpen: boolean
  /** The results header: count, sort and the phone Filters button. */
  toolbar: ReactNode
  results: ReactNode
  /** Shown under the results only when given (leave it out while loading or when nothing matches). */
  pagination?: ReactNode
  resultsKey: string
  resultsReady: boolean
}) {
  const resultsTop = useRef<HTMLDivElement>(null)
  const lastResultsKey = useRef(resultsKey)
  useEffect(() => {
    if (!resultsReady || lastResultsKey.current === resultsKey) return
    lastResultsKey.current = resultsKey
    const top = resultsTop.current
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' })
  }, [resultsReady, resultsKey])

  return (
    <div className="hiring-theme bg-background text-foreground">
      <section className="bg-surface-muted">
        <div className="container-page pt-8 lg:pt-10">{hero}</div>
      </section>

      {/* The one search bar stays under the site header while the list scrolls, so searching again never means
          scrolling back up. */}
      <div className={cn('sticky top-16 z-20 bg-surface-muted', !explore && 'border-b border-border')}>
        <div className={cn('container-page py-3', explore ? 'lg:pt-5' : 'lg:py-5')}>{search}</div>
      </div>
      {/* Without an Explore row the search band closes the hero itself, so no empty strip is left under it. */}
      {explore ? (
        <div className="border-b border-border bg-surface-muted">
          <div className="container-page pb-4 lg:pb-6">{explore}</div>
        </div>
      ) : null}

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:py-10">
        <aside className={cn('lg:block', filtersOpen ? 'max-lg:motion-popover block' : 'hidden')} aria-label="Filters">
          <div className="grid grid-cols-1 gap-4 [&>*]:min-w-0 lg:sticky lg:top-[172px] lg:max-h-[calc(100dvh-188px)] lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain">
            {filters}
          </div>
        </aside>

        <div ref={resultsTop} className="min-w-0 scroll-mt-40 lg:scroll-mt-[172px]">
          {toolbar}
          {results}
          {pagination ? <div className="mt-6 grid gap-3">{pagination}</div> : null}
        </div>
      </div>
    </div>
  )
}

/** The page title, a one-line intro, and an optional link on the right. */
export function BrowseHero({ title, intro, action }: { title: ReactNode; intro: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-[44px] sm:leading-[1.5]">{title}</h1>
        <p className="mt-1 text-[15px] text-muted">{intro}</p>
      </div>
      {action ?? null}
    </div>
  )
}

/** "Explore:" and a row of quick searches under the search bar (wide screens only). */
export function ExploreRow({ children }: { children: ReactNode }) {
  return (
    <p className="hidden flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted md:flex">
      <span>Explore:</span>
      {children}
    </p>
  )
}

/** One quick search in the Explore row; the chosen one reads green and underlined. */
export function ExploreChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('rounded underline underline-offset-4 transition-[color,text-decoration-color] duration-200 hover:text-primary hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active ? 'font-medium text-primary decoration-current' : 'decoration-transparent')}>
      {children}
    </button>
  )
}

/** The results title (read out when it changes), actions on the right, and an optional line under it. */
export function ResultsHeader({ title, actions, summary }: { title: ReactNode; actions?: ReactNode; summary?: ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold" aria-live="polite">{title}</h2>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      {summary ? <p className="mt-2 text-xs text-muted">{summary}</p> : null}
    </>
  )
}

/** The phone-only button that shows or hides the filter column; it says how many filters are on. */
export function FiltersToggle({ open, onToggle, count }: { open: boolean; onToggle: () => void; count: number }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open}
      className="interaction inline-flex h-[42px] items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-muted lg:hidden">
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filters{count ? ` (${count})` : ''}
    </button>
  )
}

/** The white filter card: a title with Reset, a short line under it, then the filter groups. */
export function FilterPanel({ intro, onReset, canReset, children }: { intro: ReactNode; onReset: () => void; canReset: boolean; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-[22px]">
      <div className="flex items-start justify-between pb-1.5">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button type="button" onClick={onReset} disabled={!canReset}
          className="text-xs font-medium text-primary hover:underline disabled:text-muted disabled:no-underline">Reset</button>
      </div>
      <p className="text-xs text-muted">{intro}</p>
      {children}
    </div>
  )
}

/** One group of filter choices with its title; `last` drops the bottom padding of the final group. */
export function FilterGroup({ title, children, last = false }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <fieldset className={cn('grid gap-[13px] border-t border-border py-[22px]', last && 'pb-0')}>
      <legend className="sr-only">{title}</legend>
      <p className="text-[13px] font-semibold" aria-hidden="true">{title}</p>
      {children}
    </fieldset>
  )
}

/** A filter choice drawn as a square checkbox, with an optional count; ticked choices read darker. */
export function FilterChoice({ label, checked, onChange, count }: { label: string; checked: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 text-[13px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span aria-hidden="true"
        className="grid size-4 shrink-0 place-items-center rounded border border-[#c5d0c8] bg-surface text-white transition-colors duration-150 group-hover:border-primary peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-1">
        {checked ? <Check className="check-pop h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className={cn('min-w-0 flex-1 transition-colors duration-150', checked ? 'font-medium text-foreground' : 'text-muted group-hover:text-foreground')}>{label}</span>
      {count != null ? <span className="font-mono text-[11px] tabular-nums text-muted">{count}</span> : null}
    </label>
  )
}
