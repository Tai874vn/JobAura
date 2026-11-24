'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { DialogPortal } from '@/features/hiring-pipeline/dialog-portal'
import { Button, Textarea } from '@/shared/ui'

type Props = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  /** When given, the dialog shows a note box with this label. */
  noteLabel?: string
  /** True: the confirm button stays off until a note is typed (for example "Request changes"). False: the note is optional. */
  noteRequired?: boolean
  noteMaxLength?: number
  /** `danger` for steps that end something (end the contract, decline, withdraw). */
  tone?: 'primary' | 'danger'
  pending?: boolean
  /** A sentence from the server when the step failed; the dialog stays open and shows it. */
  error?: string | null
  /** Extra buttons next to the error, for example "Top up". */
  errorActions?: ReactNode
  /** Extra content between the description and the note, for example a choice. */
  children?: ReactNode
  onConfirm: (note?: string) => void
  onCancel: () => void
}

/**
 * One dialog for the contract steps that need a second look. The note is optional (`noteRequired` false) or required,
 * and is sent trimmed, or not at all when empty.
 */
export function ConfirmDialog(props: Props) {
  // Mounted only while open, so the note starts empty each time.
  if (!props.open) return null
  return <ConfirmBody {...props} />
}

function ConfirmBody({
  title,
  description,
  confirmLabel,
  noteLabel,
  noteRequired = false,
  noteMaxLength = 2000,
  tone = 'primary',
  pending = false,
  error,
  errorActions,
  children,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const [note, setNote] = useState('')
  const trimmed = note.trim()
  const blocked = Boolean(noteLabel && noteRequired && !trimmed)

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
          {children}
          {noteLabel ? (
            <label className="mt-4 block text-sm font-medium">
              {noteLabel} {noteRequired ? null : <span className="font-normal text-muted">(optional)</span>}
              <Textarea className="mt-1 min-h-24 font-normal" maxLength={noteMaxLength} value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
          ) : null}
          {error ? (
            <div className="mt-4">
              <p role="alert" className="break-words text-sm text-danger">{error}</p>
              {errorActions ? <div className="mt-2 flex flex-wrap gap-2">{errorActions}</div> : null}
            </div>
          ) : null}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Cancel</Button>
            <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} loading={pending} disabled={blocked} onClick={() => onConfirm(trimmed || undefined)}>
              {confirmLabel}
            </Button>
          </div>
        </section>
      </div>
    </DialogPortal>
  )
}
