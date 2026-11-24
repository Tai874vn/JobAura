'use client'

import { X } from 'lucide-react'
import { useId, useState } from 'react'
import { DialogPortal, useDialogFocus } from '@/features/hiring-pipeline/dialog-portal'
import type { ProposalVersionView, VersionBody } from '@/shared/schemas'
import { Button } from '@/shared/ui'
import { ProposalEditor } from './proposal-editor'
import { fromVersion } from './proposal-editor-model'

/**
 * The counter-offer form in a dialog. It starts from the latest version, so the person only changes what they want.
 * A refusal from the server (for example a newer version arrived) shows inside the dialog, with the typed values kept.
 */
export function CounterDialog({
  latest,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  latest: ProposalVersionView
  pending: boolean
  error: string | null
  onSubmit: (body: VersionBody) => void
  onClose: () => void
}) {
  const titleId = useId()
  const descId = useId()
  // Read once, so the typed values are not replaced when the proposal is read again behind the dialog.
  const [initial] = useState(() => fromVersion(latest))

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
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Send a counter-offer</h2>
          <p id={descId} className="mt-1 mb-4 text-sm leading-6 text-muted">
            This starts from version {latest.number}. Change the steps, amounts or dates, then send it back.
          </p>
          <ProposalEditor initial={initial} mode="counter" pending={pending} serverError={error} onSubmit={(body) => onSubmit(body)} />
        </section>
      </div>
    </DialogPortal>
  )
}
