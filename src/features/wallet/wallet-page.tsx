'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useSession } from '@/features/auth/use-session'
import { credits } from '@/shared/lib/credits'
import { Button, Skeleton } from '@/shared/ui'
import { walletApi, walletKeys } from './api'
import { LedgerRow } from './ledger-row'
import { TopUpDialog } from './top-up-dialog'

const PAGE_SIZE = 20

/** The wallet: four figures, a place for the Top up, and the ledger (the list of every change) 20 rows at a time. */
export function WalletPage() {
  const { user } = useSession()
  const summary = useQuery({ queryKey: walletKeys.summary, queryFn: walletApi.summary, staleTime: 15_000, enabled: Boolean(user) })
  const ledger = useInfiniteQuery({
    // The person is part of the key, so another person never reads this list from the cache.
    queryKey: walletKeys.ledger({ viewerId: user?.id ?? 0, pageSize: PAGE_SIZE }),
    queryFn: ({ pageParam }) => walletApi.ledger({ page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    enabled: Boolean(user),
  })
  const rows = ledger.data?.pages.flatMap((page) => page.data) ?? []
  const data = summary.data

  return (
    <div className="container-page max-w-3xl py-6">
      <h1 className="font-display text-2xl font-medium text-foreground">Wallet</h1>
      <p className="mt-1 text-sm text-muted">Credits are demo money for this project. Every user starts with 5,000 credits.</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-busy={!data}>
        <Figure label="Available" value={data ? credits(data.available) : null} />
        <Figure label="Held" value={data ? credits(data.held) : null} />
        <Figure label="Paid out" value={data ? credits(data.paidOut) : null} />
        <Figure label="Earned" value={data ? credits(data.earned) : null} />
      </dl>
      {summary.isError ? <p className="mt-3 text-sm text-danger" role="alert">Your balance could not be loaded. Please try again.</p> : null}

      {/* Shown only when the server says VNPay is set up (topUp.enabled). */}
      <section id="top-up" aria-label="Top up" data-slot="top-up" className="mt-4 empty:hidden">
        {data?.topUp.enabled ? <TopUpButton info={data.topUp} /> : null}
      </section>

      <section className="mt-8" aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="font-display text-lg font-medium text-foreground">History</h2>
        {ledger.isPending ? (
          <div className="mt-3 grid gap-3" aria-busy="true">
            {[0, 1, 2].map((n) => <Skeleton key={n} className="h-12 w-full" />)}
          </div>
        ) : ledger.isError ? (
          <p className="mt-3 text-sm text-danger" role="alert">The history could not be loaded. Please try again.</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing here yet.</p>
        ) : (
          <ul className="mt-2 rounded-lg border border-border bg-surface px-4">
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

function TopUpButton({ info }: { info: { minCredits: number; maxCredits: number; vndPerCredit: number } }) {
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
      <dd className="mt-1 text-lg font-medium text-foreground">{value ?? <Skeleton className="h-6 w-20" />}</dd>
    </div>
  )
}
