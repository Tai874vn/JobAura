'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from './button'

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (!pending) onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onCancel, open, pending])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-2xl"
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
            <h2 id="confirmation-title" className="font-display text-lg font-bold">{title}</h2>
            <p id="confirmation-description" className="mt-1 text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button data-cancel type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? 'Removing...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
