import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Skeleton } from '@/shared/ui'

/**
 * The frame both panels (proposal and contract) sit in: a card that scrolls inside itself on wide screens, and a
 * full view with a Back link on phones. `labelledBy` is the id of the panel's title.
 * Below the `lg` width the floating Chat button sits over the bottom right corner, so the frame leaves extra room at
 * the bottom, and the panels' button rows keep `pr-24 lg:pr-0` (room on the right), like the hiring panels' `pr-28`.
 */
export function PanelFrame({ backHref, labelledBy, children }: { backHref: string; labelledBy?: string; children: ReactNode }) {
  return (
    <article className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:h-full max-lg:rounded-none max-lg:border-0" aria-labelledby={labelledBy}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-24 sm:p-6 sm:pb-24 lg:pb-6">
        <Link href={backHref} scroll={false} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All contracts
        </Link>
        {children}
      </div>
    </article>
  )
}

/** Mirrors ProposalPanel & ContractPanel (48px avatar row above h2, 4 figures, milestones) with no live buttons. */
export function PanelLoading({ backHref, title }: { backHref: string; title?: string }) {
  return (
    <PanelFrame backHref={backHref}>
      <div aria-busy="true" aria-label="Loading">
        <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 basis-40 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-48 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {title ? (
          <h2 className="mt-4 break-words font-display text-xl font-medium leading-tight">{title}</h2>
        ) : (
          <Skeleton className="mt-4 h-7 w-2/3" />
        )}
        <Skeleton className="mt-2 h-4 w-44" />
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4" aria-hidden="true">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-1.5 bg-surface p-3">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-6 h-28 w-full rounded-lg" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
      </div>
    </PanelFrame>
  )
}
