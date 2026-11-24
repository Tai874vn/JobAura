'use client'

import { Star, X } from 'lucide-react'
import { useId, useState } from 'react'
import { DialogPortal, useDialogFocus } from '@/features/hiring-pipeline/dialog-portal'
import { cn } from '@/shared/lib/utils'
import { Button, Textarea } from '@/shared/ui'

/** The client's review of a finished contract: 1 to 5 stars and a text (1 to 2000 characters). One per contract. */
export function ReviewDialog({
  freelancerName,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  freelancerName: string
  pending: boolean
  error: string | null
  onSubmit: (review: { rating: number; content: string }) => void
  onClose: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const text = content.trim()
  const ready = rating >= 1 && rating <= 5 && text.length >= 1 && text.length <= 2000

  // Focus moves into the dialog, Tab stays inside, Escape closes (not while sending), focus goes back on close.
  const dialogRef = useDialogFocus(onClose, !pending)

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) onClose()
        }}
      >
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Leave a review</h2>
          <p id={descId} className="mt-1 text-sm leading-6 text-muted">How was working with {freelancerName}? The review shows on the service page. You can leave one per contract.</p>

          <form
            noValidate
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (ready && !pending) onSubmit({ rating, content: text })
            }}
          >
            <fieldset>
              <legend className="text-sm font-medium">Rating</legend>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer rounded-md p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-bright">
                    <input type="radio" name="review-rating" className="sr-only" checked={rating === n} onChange={() => setRating(n)} aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} />
                    <Star aria-hidden className={cn('h-7 w-7', n <= rating ? 'fill-rating text-rating' : 'text-border')} />
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              Your review
              <Textarea className="mt-1 min-h-28 font-normal" maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} />
            </label>

            {error ? <p role="alert" className="break-words text-sm text-danger">{error}</p> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button data-dialog-cancel type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
              <Button type="submit" loading={pending} disabled={!ready}>Send review</Button>
            </div>
          </form>
        </section>
      </div>
    </DialogPortal>
  )
}
