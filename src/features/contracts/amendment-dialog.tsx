'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { DialogPortal } from '@/features/hiring-pipeline/dialog-portal'
import type { ContractDetail } from '@/shared/schemas'
import { Button, Textarea } from '@/shared/ui'
import { amendmentStart, buildAmendment, type AmendmentBody } from './amendment-changes'
import { ProposalEditor } from './proposal-editor'

const MAX_CHANGES = 10

/**
 * "Propose a change": the proposal editor in amendment mode, started from the milestones as they are now.
 * Only allowed fields can change (due dates on milestones not yet submitted or paid, amounts only before funding,
 * new milestones at the end, the deadline). What is sent is the difference, worked out by `buildAmendment`.
 * `preset` starts one milestone at a lower amount (from "Ask to lower the amount").
 */
export function AmendmentDialog({
  contract,
  otherName,
  preset,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  contract: ContractDetail
  otherName: string
  preset?: { milestoneId: number; amount: number }
  pending: boolean
  error: string | null
  onSubmit: (body: AmendmentBody & { note?: string }) => void
  onClose: () => void
}) {
  const titleId = useId()
  // Read once, so the typed values stay when the contract is read again behind the dialog.
  const [start] = useState(() => amendmentStart(contract, preset))
  const [note, setNote] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, pending])

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) onClose()
        }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Propose a change</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Move due dates, change the amount of a milestone that is not funded yet, add milestones at the end, or set a new
            deadline. {otherName} accepts or declines. Deadlines keep running meanwhile.
          </p>
          <label className="mt-4 block text-sm font-medium">
            Note <span className="font-normal text-muted">(optional)</span>
            <Textarea className="mt-1 min-h-16 font-normal" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why the change is needed." />
          </label>
          <div className="mt-4">
            <ProposalEditor
              initial={start.initial}
              mode="amendment"
              lockedRows={start.lockedRows}
              pending={pending}
              serverError={localError ?? error}
              onSubmit={(_body, state) => {
                const body = buildAmendment(contract, state)
                if (!body.changes.length && !body.deadline) {
                  setLocalError('Nothing changed yet. Move a date, change an amount, add a milestone or set a new deadline.')
                  return
                }
                if (body.changes.length > MAX_CHANGES) {
                  setLocalError('changes can have up to 10 items.')
                  return
                }
                setLocalError(null)
                onSubmit({ ...body, ...(note.trim() ? { note: note.trim() } : {}) })
              }}
            />
          </div>
        </section>
      </div>
    </DialogPortal>
  )
}
