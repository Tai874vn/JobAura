'use client'

import { walletConfig } from '@/features/wallet/config/wallet'

import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { credits } from '@/shared/lib/credits'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, DialogPortal, Input, useDialogFocus } from '@/shared/ui'
import { openCheckout, walletApi } from '../api'

export type TopUpInfo = { minCredits: number; maxCredits: number; centsPerCredit: number }

// Set in src/features/wallet/config/wallet.ts (topUpQuickPicks).
const QUICK_PICKS = walletConfig.topUpQuickPicks

/** Asks how many credits to add, then sends the browser to Stripe Checkout in test mode (a full page change). */
export function TopUpDialog({ info, onClose }: { info: TopUpInfo; onClose: () => void }) {
  const titleId = useId()
  const errorId = useId()
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const bounds = { min: info.minCredits, max: info.maxCredits }
  const problem = topUpErrors(text, bounds)
  const amount = parseTopUpAmount(text)
  // Data: walletApi.startTopUp → POST /api/wallet/top-ups → NestjsBE/src/modules/wallet/services/top-ups.service.ts start()
  const start = useMutation({
    mutationFn: (n: number) => walletApi.startTopUp(n),
    // The browser leaves this site, so nothing else to do. The credits are added when Stripe tells our server.
    onSuccess: ({ checkoutUrl }) => openCheckout(checkoutUrl),
  })

  const dialogRef = useDialogFocus(onClose, !start.isPending)

  const submit = () => {
    setTouched(true)
    if (problem || amount === null) return
    start.mutate(amount)
  }
  const picks = QUICK_PICKS.filter((n) => n >= info.minCredits && n <= info.maxCredits)

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !start.isPending) onClose()
        }}
      >
        <form
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={start.isPending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Top up</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Sandbox test payment — no real money. Add between {credits(info.minCredits)} and {credits(info.maxCredits)}.
          </p>

          <label className="mt-4 block text-sm font-medium">
            Credits to add
            <Input
              className="mt-1 font-normal"
              inputMode="numeric"
              autoComplete="off"
              value={text}
              onChange={(event) => { setText(event.target.value); setTouched(true) }}
              aria-invalid={touched && Boolean(problem)}
              aria-describedby={touched && problem ? errorId : undefined}
            />
          </label>
          {touched && problem ? <p id={errorId} className="mt-1 text-sm text-danger">{problem}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {picks.map((n) => (
              <Button key={n} type="button" size="sm" variant="secondary" onClick={() => { setText(String(n)); setTouched(true) }}>
                {credits(n)}
              </Button>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted">
            {amount !== null && !problem
              ? `You will pay ${usdText(amount, info.centsPerCredit)} in Stripe test mode. Use the test card 4242 4242 4242 4242; no real money moves.`
              : 'You will pay in Stripe test mode with a test card. No real money moves.'}
          </p>
          {start.isError ? <p role="alert" className="mt-3 break-words text-sm text-danger">{getErrorMessage(start.error)}</p> : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button data-dialog-cancel type="button" variant="secondary" onClick={onClose} disabled={start.isPending}>Cancel</Button>
            <Button type="submit" loading={start.isPending} disabled={touched && Boolean(problem)}>Continue</Button>
          </div>
        </form>
      </div>
    </DialogPortal>
  )
}

const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Reads what the person typed as a whole number of credits. Commas are allowed. Anything else gives null. */
export function parseTopUpAmount(text: string): number | null {
  const clean = text.trim().replace(/,/g, '')
  if (!/^\d+$/.test(clean)) return null
  return Number(clean)
}

/** The message under the amount box, or null when the amount is fine. Mirrors the server (10 to 10,000, whole). */
export function topUpErrors(text: string, bounds: { min: number; max: number }): string | null {
  if (!text.trim()) return 'Enter how many credits to add.'
  const amount = parseTopUpAmount(text)
  if (amount === null) return 'Use a whole number of credits.'
  if (amount < bounds.min) return `Enter at least ${grouped.format(bounds.min)} credits.`
  if (amount > bounds.max) return `Enter at most ${grouped.format(bounds.max)} credits.`
  return null
}

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** What Stripe test mode charges, for example 1,250 credits at 5 cents gives "$62.50". */
export function usdText(creditAmount: number, centsPerCredit: number): string {
  return dollars.format((creditAmount * centsPerCredit) / 100)
}
