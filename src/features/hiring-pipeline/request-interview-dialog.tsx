'use client'

import { Plus, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Button, Input, Select, Textarea } from '@/shared/ui'
import type { InterviewRequest } from './api'
import { DialogPortal } from './dialog-portal'
import { durationOptions, validateInterviewRequest, type InterviewDraft } from './request-interview-validation'

type Props = {
  open: boolean
  /** True when the interview already exists and only new times are sent (no mode, length or address). */
  timesOnly?: boolean
  pending?: boolean
  /** A sentence from the server when sending failed; the dialog stays open with the typed values. */
  serverError?: string | null
  onSubmit: (request: InterviewRequest) => void
  onClose: () => void
}

const modes: { value: InterviewRequest['mode']; label: string }[] = [
  { value: 'ONLINE', label: 'Online on JobAura' },
  { value: 'ONSITE', label: 'Onsite' },
  { value: 'PHONE', label: 'Phone' },
]

/** The recruiter proposes 1 to 3 times. The dialog checks them before it sends, and names the field that is wrong. */
export function RequestInterviewDialog(props: Props) {
  // Mounted only while open, so the form starts clean each time.
  if (!props.open) return null
  return <RequestInterviewForm {...props} />
}

function RequestInterviewForm({ timesOnly = false, pending = false, serverError, onSubmit, onClose }: Props) {
  const titleId = useId()
  const [draft, setDraft] = useState<InterviewDraft>({ mode: 'ONLINE', times: [''], durationMinutes: 45, location: '', note: '' })
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof InterviewDraft>(key: K, value: InterviewDraft[K]) => {
    setError(null)
    setDraft((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, pending])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = validateInterviewRequest(draft, new Date(), { timesOnly })
    if ('error' in result) setError(result.error)
    else onSubmit(result.request)
  }

  return (
    <DialogPortal>
    <div
      className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose()
      }}
    >
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="motion-panel max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="font-display text-lg font-medium">{timesOnly ? 'Send new times' : 'Request an interview'}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Close" className="-mr-2 -mt-2 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted">Times are in your own time zone. The candidate picks one.</p>

        {timesOnly ? null : (
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">How</legend>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
              {modes.map((mode) => (
                <label key={mode.value} className="flex items-center gap-2 text-sm">
                  <input type="radio" name="interview-mode" className="h-4 w-4 accent-primary" checked={draft.mode === mode.value} onChange={() => set('mode', mode.value)} />
                  {mode.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Times (1 to 3)</legend>
          <div className="mt-1 space-y-2">
            {draft.times.map((value, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  className="min-w-0 flex-1 text-base sm:text-sm"
                  aria-label={`Time ${index + 1}`}
                  value={value}
                  onChange={(event) => set('times', draft.times.map((time, at) => (at === index ? event.target.value : time)))}
                />
                {draft.times.length > 1 ? (
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remove time ${index + 1}`} onClick={() => set('times', draft.times.filter((_, at) => at !== index))}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {draft.times.length < 3 ? (
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => set('times', [...draft.times, ''])}>
              <Plus className="h-4 w-4" />
              Add a time
            </Button>
          ) : null}
        </fieldset>

        {timesOnly ? null : (
          <>
            <label className="mt-4 block text-sm font-medium">
              Length
              <Select className="mt-1 font-normal" value={draft.durationMinutes} onChange={(event) => set('durationMinutes', Number(event.target.value))}>
                {durationOptions.map((minutes) => (
                  <option key={minutes} value={minutes}>{minutes} min</option>
                ))}
              </Select>
            </label>
            {draft.mode === 'ONLINE' ? null : (
              <label className="mt-4 block text-sm font-medium">
                {draft.mode === 'ONSITE' ? 'Address' : 'Phone number'}
                {draft.mode === 'ONSITE' ? null : <span className="font-normal text-muted"> (optional)</span>}
                <Input className="mt-1 font-normal" maxLength={300} value={draft.location} onChange={(event) => set('location', event.target.value)} />
              </label>
            )}
            <label className="mt-4 block text-sm font-medium">
              Note <span className="font-normal text-muted">(optional)</span>
              <Textarea className="mt-1 min-h-20 font-normal" maxLength={1000} value={draft.note} onChange={(event) => set('note', event.target.value)} />
            </label>
          </>
        )}

        {error ?? serverError ? <p role="alert" className="mt-4 break-words text-sm text-danger">{error ?? serverError}</p> : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" loading={pending}>{timesOnly ? 'Send times' : 'Send request'}</Button>
        </div>
      </form>
    </div>
    </DialogPortal>
  )
}
