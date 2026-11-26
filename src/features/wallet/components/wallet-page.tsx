'use client'

import { walletConfig } from '@/features/wallet/config/wallet'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { credits } from '@/shared/lib/credits'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, Skeleton } from '@/shared/ui'
import { walletApi, walletKeys } from '../api'
import { TopUpDialog } from './top-up-dialog'
import Link from 'next/link'
import type { LedgerEntryView } from '@/shared/schemas'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'

// Set in src/features/wallet/config/wallet.ts (ledgerPageSize).
const PAGE_SIZE = walletConfig.ledgerPageSize

/** The wallet: four figures, a place for the Top up, and the ledger (the list of every change) 20 rows at a time. */
export function WalletPage() {
  const { user } = useSession()
  // Data: walletApi.summary → GET /api/wallet → NestjsBE/src/modules/wallet/services/wallet.service.ts summary()
  const summary = useQuery({ queryKey: walletKeys.summary(user?.id), queryFn: walletApi.summary, staleTime: 15_000, enabled: Boolean(user) })
  const ledger = useInfiniteQuery({
    // The viewer id is an explicit segment of the key so another person never reads this list from cache.
    queryKey: walletKeys.ledger({ pageSize: PAGE_SIZE }, user?.id),
    queryFn: ({ pageParam }) => walletApi.ledger({ page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    staleTime: 15_000,
    enabled: Boolean(user),
  })
  const rows = ledger.data?.pages.flatMap((page) => page.data) ?? []
  const data = summary.data
  const missingFigure = summary.isError ? '—' : null

  return (
    <div className="container-page max-w-3xl py-6">
      <h1 className="font-display text-2xl font-medium text-foreground">Wallet</h1>
      <p className="mt-1 text-sm text-muted">Credits are demo money for this project. Every user starts with 5,000 credits.</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy={summary.isPending}>
        <Figure label="Available" value={data ? credits(data.available) : missingFigure} />
        <Figure label="Held" value={data ? credits(data.held) : missingFigure} />
        <Figure label="Paid out" value={data ? credits(data.paidOut) : missingFigure} />
        <Figure label="Earned" value={data ? credits(data.earned) : missingFigure} />
      </dl>
      {summary.isError ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/25 bg-surface px-4 py-3 text-sm" role="alert">
          <p className="text-danger">Your balance could not be loaded. {getErrorMessage(summary.error)}</p>
          <Button type="button" size="sm" variant="secondary" loading={summary.isFetching} onClick={() => summary.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {/* Shown while loading (keeps height steady) and whenever the server says Stripe is set up (topUp.enabled). */}
      <section id="top-up" aria-label="Top up" data-slot="top-up" className="mt-4 empty:hidden">
        {summary.isPending ? <Skeleton className="h-10 w-24 rounded-lg" /> : data?.topUp.enabled ? <TopUpButton info={data.topUp} /> : null}
      </section>

      <section className="mt-8" aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="font-display text-lg font-medium text-foreground">History</h2>
        {ledger.isPending ? (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface px-4" aria-busy="true" aria-label="Loading history">
            {[0, 1, 2, 3, 4].map((n) => (
              <li key={n} className="flex items-center justify-between gap-4 py-3.5" aria-hidden="true">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-52 max-w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-4 w-24 shrink-0" />
              </li>
            ))}
          </ul>
        ) : ledger.isError ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/25 bg-surface px-4 py-3 text-sm" role="alert">
            <p className="text-danger">The history could not be loaded. {getErrorMessage(ledger.error)}</p>
            <Button type="button" size="sm" variant="secondary" loading={ledger.isFetching} onClick={() => ledger.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing here yet.</p>
        ) : (
          <ul className="results-in mt-2 rounded-lg border border-border bg-surface px-4">
            {rows.map((entry) => <LedgerRow key={entry.id} entry={entry} />)}
          </ul>
        )}
        {ledger.hasNextPage ? (
          <Button className="mx-auto mt-3 flex" variant="secondary" onClick={() => ledger.fetchNextPage()} loading={ledger.isFetchingNextPage}>
            <ChevronDown className="h-4 w-4" />
            Load more
          </Button>
        ) : null}
      </section>
    </div>
  )
}

function TopUpButton({ info }: { info: { minCredits: number; maxCredits: number; centsPerCredit: number } }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Top up</Button>
      {open ? <TopUpDialog info={info} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function Figure({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-medium text-foreground">{value ?? <Skeleton className="h-7 w-24" />}</dd>
    </div>
  )
}

/** One line of the ledger: date, a sentence (a link to the contract when there is one), the change and the balance after. */
export function LedgerRow({ entry }: { entry: LedgerEntryView }) {
  const text = ledgerText(entry)
  const change = entry.availableDelta !== 0 ? entry.availableDelta : entry.heldDelta
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-xs text-muted">{formatPipelineDay(entry.createdAt)}</p>
        {entry.contract ? (
          <Link href={`/contracts?contract=${entry.contract.id}`} className="break-words text-sm font-medium text-primary hover:underline">{text}</Link>
        ) : (
          <p className="break-words text-sm font-medium text-foreground">{text}</p>
        )}
      </div>
      {/* On a phone the amount drops under the sentence and lines up on the left; on wider screens it sits on the right. */}
      <div className="w-full sm:w-auto sm:text-right">
        <p className={change > 0 ? 'text-sm font-medium text-primary' : 'text-sm font-medium text-foreground'}>{ledgerAmount(entry)}</p>
        <p className="text-xs text-muted">Balance {credits(entry.availableAfter)}</p>
      </div>
    </li>
  )
}

/**
 * One ledger row as a plain sentence. A release has two sides and the row itself tells which one it is:
 * the person who earns gets credits in "available" (so the delta is above 0), while the person who pays
 * only sees their "held" credits go down. So no viewer id is needed.
 */
export function ledgerText(entry: LedgerEntryView): string {
  const step = entry.milestone ? `milestone ${entry.milestone.position}` : 'a milestone'
  const who = entry.counterparty?.name
  switch (entry.type) {
    case 'SEED':
      return 'Starting credits'
    case 'TOP_UP':
      return 'Top up'
    case 'FUND_HOLD':
      return `Held for ${step}${entry.contract ? ` · ${entry.contract.title}` : ''}`
    case 'RELEASE':
      return entry.availableDelta > 0
        ? `Earned${who ? ` from ${who}` : ''} for ${step}`
        : `Paid${who ? ` to ${who}` : ''} for ${step}`
    case 'REFUND':
      return entry.milestone ? `Refund for ${step}` : 'Refund'
  }
}

/** The change shown on a row: the available change when it is not 0, else the held change. */
export function ledgerAmount(entry: LedgerEntryView): string {
  return credits(entry.availableDelta !== 0 ? entry.availableDelta : entry.heldDelta, { sign: true })
}
