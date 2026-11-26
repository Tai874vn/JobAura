'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { credits } from '@/shared/lib/credits'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, Skeleton } from '@/shared/ui'
import { walletApi, walletKeys } from '../api'

export type ReturnResult = 'success' | 'error' | 'cancel' | null

/** How long the page keeps asking while the top up is still PENDING. */
export const POLL_MS = 3_000
export const POLL_FOR_MS = 90_000

/**
 * Reads `?topUp=7&result=success` from the Stripe return URL. The result only picks the words
 * shown while waiting: whether money arrived is decided by the server, never by this URL.
 */
export function readReturnParams(search: string): { topUpId: number | null; result: ReturnResult } {
  const params = new URLSearchParams(search)
  const id = Number(params.get('topUp'))
  const result = params.get('result')
  return {
    topUpId: Number.isInteger(id) && id > 0 ? id : null,
    result: result === 'success' || result === 'error' || result === 'cancel' ? result : null,
  }
}

/** What the person reads for each answer of the payment check. */
export function topUpOutcome(
  r: { status: 'PAID' | 'FAILED' | 'PENDING'; credits: number; available: number },
  result: ReturnResult = null,
  stillWaiting = true,
): { title: string; detail: string | null } {
  if (r.status === 'PAID') return { title: `Top up complete · ${credits(r.credits, { sign: true })} · Balance ${credits(r.available)}`, detail: null }
  if (r.status === 'FAILED') return { title: 'Payment was not completed', detail: 'Nothing was added to your balance.' }
  if (result === 'cancel') return { title: 'Payment cancelled', detail: 'Nothing was added to your balance. You can start a new top up from your wallet.' }
  if (result === 'error') return { title: 'Payment was not completed', detail: 'The payment did not go through. Nothing was added to your balance.' }
  if (stillWaiting) return { title: 'Waiting for Stripe to confirm', detail: 'This usually takes a few seconds.' }
  return { title: 'Still waiting for Stripe', detail: 'If you paid, the credits are added as soon as Stripe confirms. Check again later.' }
}

const subscribeNothing = () => () => {} // the address does not change while this page is open

/** The page Stripe sends the browser back to. It asks the server about the top up until it is settled. */
export function TopUpReturn() {
  const client = useQueryClient()
  const { user } = useSession()
  // The query string only exists in the browser, so it is read after the page loads.
  const search = useSyncExternalStore(subscribeNothing, () => window.location.search, () => null)
  const { topUpId, result } = search === null ? { topUpId: null, result: null } : readReturnParams(search)
  // After POLL_FOR_MS the page stops asking by itself; "Check again" still works.
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), POLL_FOR_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const check = useQuery({
    queryKey: walletKeys.topUpStatus(topUpId, user?.id),
    queryFn: () => walletApi.topUpStatus(topUpId!),
    enabled: topUpId !== null && Boolean(user),
    retry: false,
    // Keep asking while PENDING after a success return, for a while (the IPN usually lands in seconds).
    refetchInterval: (query) =>
      query.state.data?.status === 'PENDING' && result === 'success' && !timedOut ? POLL_MS : false,
  })
  const status = check.data?.status
  // The balance and history may have changed, so the wallet is fetched again (not this check itself).
  useEffect(() => {
    if (status === 'PAID') void client.invalidateQueries({ queryKey: ['wallet'], predicate: (q) => q.queryKey[1] !== 'top-up-status' })
  }, [status, client])

  const stillWaiting = result === 'success' && !timedOut
  const outcome = check.data ? topUpOutcome(check.data, result, stillWaiting) : null
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="font-display text-2xl font-medium text-foreground">Top up</h1>
      <div className="mt-4 rounded-lg border border-border bg-surface p-5" aria-live="polite">
        {search !== null && topUpId === null ? (
          <>
            <p className="text-base font-medium text-foreground">No payment details found</p>
            <p className="mt-1 text-sm text-muted">Return here from Stripe after a top up to check its status.</p>
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
