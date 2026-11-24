import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Skeleton } from '@/shared/ui'

/**
 * The frame both panels (proposal and contract) sit in: a card that scrolls inside itself on wide screens, and a
 * full view with a Back link on phones. `labelledBy` is the id of the panel's title.
 */
export function PanelFrame({ backHref, labelledBy, children }: { backHref: string; labelledBy?: string; children: ReactNode }) {
  return (
    <article className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:h-full max-lg:rounded-none max-lg:border-0" aria-labelledby={labelledBy}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        <Link href={backHref} scroll={false} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary lg:hidden">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All contracts
        </Link>
        {children}
      </div>
    </article>
  )
}

/** What the panel shows while the proposal or contract is being read: no buttons, so nothing can be pressed too early. */
export function PanelLoading({ backHref, title }: { backHref: string; title?: string }) {
  return (
    <PanelFrame backHref={backHref}>
      <div aria-busy="true" aria-label="Loading">
        {title ? <h2 className="break-words font-display text-xl font-medium leading-tight">{title}</h2> : <Skeleton className="h-7 w-2/3" />}
        <Skeleton className="mt-4 h-5 w-1/3" />
        <Skeleton className="mt-6 h-32 w-full rounded-lg" />
        <Skeleton className="mt-4 h-24 w-full rounded-lg" />
      </div>
    </PanelFrame>
  )
}
