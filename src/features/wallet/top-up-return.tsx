'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { useSession } from '@/features/auth/use-session'
import { credits } from '@/shared/lib/credits'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, Skeleton } from '@/shared/ui'
import { walletApi, walletKeys } from './api'

/** What the person reads for each answer of the payment check. */
export function topUpOutcome(r: { status: 'PAID' | 'FAILED' | 'PENDING'; credits: number; available: number }): { title: string; detail: string | null } {
  if (r.status === 'PAID') return { title: `Top up complete · ${credits(r.credits, { sign: true })} · Balance ${credits(r.available)}`, detail: null }
  if (r.status === 'FAILED') return { title: 'Payment was not completed', detail: 'Nothing was added to your balance.' }
  return { title: 'Waiting for VNPay to confirm', detail: 'This can take a moment. Check again in a few seconds.' }
}

const subscribeNothing = () => () => {} // the address does not change while this page is open

/** The page VNPay sends the browser back to. It passes the query string on to the server, unchanged. */
export function TopUpReturn() {
  const client = useQueryClient()
  const { user } = useSession()
  // The query string only exists in the browser, so it is read after the page loads.
  const query = useSyncExternalStore(subscribeNothing, () => window.location.search, () => null)
  const hasReturnParams = Boolean(query && query.length > 1)

  const check = useQuery({
    queryKey: walletKeys.topUpReturn(query, user?.id),
    queryFn: () => walletApi.topUpReturn(query ?? ''),
    // Avoid sending an empty return check when someone opens /wallet/top-up/return directly without VNPay params.
    enabled: hasReturnParams && Boolean(user),
    retry: false,
    staleTime: Infinity,
  })
  const status = check.data?.status
  // The balance and history may have changed, so the wallet is fetched again (not this check itself).
  useEffect(() => {
    if (status) void client.invalidateQueries({ queryKey: ['wallet'], predicate: (q) => q.queryKey[1] !== 'top-up-return' })
  }, [status, client])

  const outcome = check.data ? topUpOutcome(check.data) : null
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="font-display text-2xl font-medium text-foreground">Top up</h1>
      <div className="mt-4 rounded-lg border border-border bg-surface p-5" aria-live="polite">
        {query !== null && !hasReturnParams ? (
          <>
            <p className="text-base font-medium text-foreground">No payment details found</p>
            <p className="mt-1 text-sm text-muted">Return here from VNPay after a top up to check its status.</p>
          </>
        ) : check.isError ? (
          <p role="alert" className="text-sm text-danger">{getErrorMessage(check.error)}</p>
        ) : outcome ? (
          <div className="results-in">
            <p className="text-base font-medium text-foreground">{outcome.title}</p>
            {outcome.detail ? <p className="mt-1 text-sm text-muted">{outcome.detail}</p> : null}
          </div>
        ) : (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-6 w-64 max-w-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {status === 'PENDING' ? <Button variant="secondary" onClick={() => check.refetch()} loading={check.isFetching}>Check again</Button> : null}
          <ButtonLink href="/wallet">Back to wallet</ButtonLink>
        </div>
      </div>
    </div>
  )
}
