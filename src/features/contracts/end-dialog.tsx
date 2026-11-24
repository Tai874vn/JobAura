'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { DialogPortal } from '@/features/hiring-pipeline/dialog-portal'
import type { EndChoice } from '@/shared/schemas'
import { Button, Textarea } from '@/shared/ui'

export const endChoiceWords: Record<EndChoice, string> = {
  APPROVE: 'Approve and pay for the submitted work',
  REFUND: 'Refund it to me',
}

/**
 * Ask to end the contract together (`request`, with an optional note), or agree to the other person's request
 * (`accept`). While a milestone waits for review, the client must also say what happens to that work: pay for it,
 * or take the credits back. Send stays off until that choice is made.
 */
export function EndDialog({
  mode,
  otherName,
  submittedWork,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  mode: 'request' | 'accept'
  otherName: string
  /** Set only for the client while a milestone is SUBMITTED, e.g. "Milestone 2: Colour versions · 500 credits". */
  submittedWork: string | null
  pending: boolean
  error: string | null
  onConfirm: (input: { note?: string; choice?: EndChoice }) => void
  onClose: () => void
}) {
  const titleId = useId()
  const [note, setNote] = useState('')
  const [choice, setChoice] = useState<EndChoice | null>(null)
  const blocked = submittedWork !== null && choice === null

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, pending])

  const title = mode === 'request' ? 'Ask to end the contract?' : 'End the contract together?'
  const description =
    mode === 'request'
      ? `${otherName} is asked to agree. Until then the contract goes on as usual, and no deadline stops.`
      : 'The contract ends now. Held credits go back to the client, milestones not funded are cancelled, paid ones stay paid.'

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) onClose()
        }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>

          {submittedWork ? (
            <fieldset className="mt-4 min-w-0">
              <legend className="text-sm font-medium">The submitted work</legend>
              <p className="mt-0.5 break-words text-sm text-muted">{submittedWork}</p>
              <div className="mt-2 space-y-2">
                {(['APPROVE', 'REFUND'] as const).map((value) => (
                  <label key={value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-primary">
                    <input type="radio" name="end-choice" className="mt-0.5 accent-primary" checked={choice === value} onChange={() => setChoice(value)} />
                    <span>{endChoiceWords[value]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {mode === 'request' ? (
            <label className="mt-4 block text-sm font-medium">
              Note <span className="font-normal text-muted">(optional)</span>
              <Textarea className="mt-1 min-h-20 font-normal" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          ) : null}

          {error ? <p role="alert" className="mt-4 break-words text-sm text-danger">{error}</p> : null}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button
              type="button"
              variant="danger"
              loading={pending}
              disabled={blocked}
              onClick={() => onConfirm({ note: note.trim() || undefined, choice: choice ?? undefined })}
            >
              {mode === 'request' ? 'Send end request' : 'End the contract'}
            </Button>
          </div>
        </section>
      </div>
    </DialogPortal>
  )
}
