'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button, Textarea } from '@/shared/ui'
import { DialogPortal } from './dialog-portal'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  /** When given, the dialog shows an optional note box with this label. */
  noteLabel?: string
  /** `danger` for steps that end something (reject, decline, withdraw). */
  tone?: 'primary' | 'danger'
  pending?: boolean
  /** A sentence from the server when the step failed; the dialog stays open and shows it. */
  error?: string | null
  onConfirm: (note?: string) => void
  onCancel: () => void
}

/**
 * One dialog for the steps that need a second look: reject, send or withdraw an offer, decline, withdraw an
 * application, cancel an interview. The note is optional and is sent only when something was typed.
 */
export function ConfirmActionDialog(props: Props) {
  // Mounted only while open, so the note starts empty each time.
  if (!props.open) return null
  return <ConfirmActionBody {...props} />
}

function ConfirmActionBody({
  title,
  description,
  confirmLabel,
  noteLabel,
  tone = 'primary',
  pending = false,
  error,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const [note, setNote] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel, pending])

  return (
    <DialogPortal>
    <div
      className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel()
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
        <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onCancel} disabled={pending} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <h2 id={titleId} className="pr-10 font-display text-lg font-medium">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        {noteLabel ? (
          <label className="mt-4 block text-sm font-medium">
            {noteLabel} <span className="font-normal text-muted">(optional)</span>
            <Textarea className="mt-1 min-h-20 font-normal" maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        ) : null}
        {error ? <p role="alert" className="mt-4 break-words text-sm text-danger">{error}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
          <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} loading={pending} onClick={() => onConfirm(note.trim() || undefined)}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
    </DialogPortal>
  )
}
