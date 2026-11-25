'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useId } from 'react'
import { Button } from './button'
import { DialogPortal, useDialogFocus } from './dialog-portal'

type ConfirmationDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  if (!props.open) return null
  return <ConfirmationDialogBody {...props} />
}

function ConfirmationDialogBody({
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = useId()
  const descId = useId()
  // Focus starts on Cancel, Tab stays inside the box, Escape closes only this dialog (not an underlying modal).
  const dialogRef = useDialogFocus(onCancel, !pending)

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/55 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !pending) onCancel()
        }}
      >
        <section
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="motion-panel relative w-full max-w-md rounded-lg bg-surface p-5 shadow-overlay"
        >
          <Button
            className="absolute right-2 top-2"
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={pending}
            title="Close confirmation"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-start gap-3 pr-9">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-medium">{title}</h2>
              <p id={descId} className="mt-1 text-sm leading-6 text-muted">{description}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button data-cancel data-dialog-cancel type="button" variant="secondary" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={onConfirm} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </section>
      </div>
    </DialogPortal>
  )
}
