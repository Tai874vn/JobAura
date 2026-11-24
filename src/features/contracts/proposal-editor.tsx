'use client'

import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { credits } from '@/shared/lib/credits'
import { imageUploadAccept } from '@/shared/lib/file-validation'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import type { MilestoneStatus, VersionBody } from '@/shared/schemas'
import { Button, Input, Textarea } from '@/shared/ui'
import { contractsApi } from './api'
import {
  MAX_MILESTONES,
  MAX_REFERENCES,
  blankRow,
  editorErrors,
  editorTotal,
  errorFor,
  isRowClosed,
  toVersionBody,
  todayString,
  type EditorRow,
  type EditorState,
} from './proposal-editor-model'

type Props = {
  initial: EditorState
  /**
   * new: the first proposal. counter: an answer to a proposal. amendment: a change in the middle of a contract
   * (only the deadline and the milestones show; a milestone that is already funded keeps its amount, and a
   * SUBMITTED, APPROVED or CANCELLED one is read-only).
   */
  mode: 'new' | 'counter' | 'amendment'
  /** Amendment only: the status of each existing row, by row key. Rows not listed here are new. */
  lockedRows?: Record<string, MilestoneStatus>
  pending?: boolean
  /** A sentence from the server when sending failed; the form stays with the typed values. */
  serverError?: string | null
  submitLabel?: string
  onSubmit: (body: VersionBody, state: EditorState) => void
}

const defaultLabels = { new: 'Send proposal', counter: 'Send counter-offer', amendment: 'Send change request' } as const

/** The form for a proposal, a counter-offer or a contract change. Errors name the field; Send stays off while one is left. */
export function ProposalEditor({ initial, mode, lockedRows, pending = false, serverError, submitLabel, onSubmit }: Props) {
  const [state, setState] = useState<EditorState>(initial)
  const [today] = useState(() => todayString())
  const [briefTouched, setBriefTouched] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [originalDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.rows.filter((r) => lockedRows?.[r.key] !== undefined).map((r) => [r.key, r.dueDate])),
  )
  const nextKey = useRef(1)
  const fileInput = useRef<HTMLInputElement>(null)

  const amendment = mode === 'amendment'
  const statusOf = (key: string) => lockedRows?.[key]
  const closedKeys = new Set(state.rows.filter((r) => isRowClosed(statusOf(r.key))).map((r) => r.key))
  const cancelledKeys = new Set(state.rows.filter((r) => statusOf(r.key) === 'CANCELLED').map((r) => r.key))
  const allErrors = editorErrors(state, today, {
    closedKeys,
    cancelledKeys,
    // Amendment mode uses the server's change-request rules, which need the dates the rows started with.
    originalDates: amendment ? originalDates : undefined,
  })
  // An amendment does not carry a brief or references.
  const errors = amendment ? allErrors.filter((e) => e.field !== 'brief' && !e.field.startsWith('reference')) : allErrors
  const total = editorTotal(state.rows)

  const patch = (change: Partial<EditorState>) => setState((s) => ({ ...s, ...change }))
  const patchRow = (key: string, change: Partial<EditorRow>) =>
    setState((s) => ({ ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, ...change } : r)) }))

  function addRow() {
    const last = state.rows[state.rows.length - 1]
    patch({ rows: [...state.rows, blankRow(`n${nextKey.current++}`, last?.dueDate ?? '')] })
  }
  function removeRow(key: string) {
    patch({ rows: state.rows.filter((r) => r.key !== key) })
  }
  function moveRow(index: number, by: -1 | 1) {
    const rows = [...state.rows]
    const target = index + by
    if (target < 0 || target >= rows.length) return
    ;[rows[index], rows[target]] = [rows[target], rows[index]]
    patch({ rows })
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        if (state.referenceImages.length + urls.length >= MAX_REFERENCES) {
          toast.error('You can add up to 10 images.')
          break
        }
        try {
          urls.push((await contractsApi.uploadImage(file)).url)
        } catch (error) {
          toast.error(getErrorMessage(error, 'Could not upload this image.'))
        }
      }
      if (urls.length) setState((s) => ({ ...s, referenceImages: [...s.referenceImages, ...urls] }))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const visibleBriefError = briefTouched ? errorFor(errors, 'brief') : undefined
  const blocked = errors.length > 0 || pending || uploading

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!blocked) onSubmit(toVersionBody(state), state)
      }}
    >
      {amendment ? null : (
        <>
          <div>
            <label htmlFor="pe-brief" className="text-sm font-medium">Brief</label>
            <Textarea
              id="pe-brief"
              className="mt-1"
              maxLength={5000}
              value={state.brief}
              aria-invalid={Boolean(visibleBriefError)}
              onChange={(e) => patch({ brief: e.target.value })}
              onBlur={() => setBriefTouched(true)}
              placeholder="What do you need, and what should the result look like?"
            />
            <FieldError message={visibleBriefError} />
          </div>

          <LinkList links={state.referenceLinks} error={errorFor(errors, 'referenceLinks')} onChange={(referenceLinks) => patch({ referenceLinks })} />

          <div>
            <p className="text-sm font-medium">Reference images <span className="font-normal text-muted">(optional, up to 10)</span></p>
            {state.referenceImages.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {state.referenceImages.map((url, i) => (
                  <li key={url} className="relative">
                    <Image src={url} alt={`Reference image ${i + 1}`} width={80} height={80} className="h-20 w-20 rounded-md border border-border object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove reference image ${i + 1}`}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
                      onClick={() => patch({ referenceImages: state.referenceImages.filter((u) => u !== url) })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <input ref={fileInput} type="file" accept={imageUploadAccept} multiple hidden onChange={(e) => void onFiles(e.target.files)} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              loading={uploading}
              disabled={state.referenceImages.length >= MAX_REFERENCES}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus className="h-4 w-4" /> Add image
            </Button>
            <FieldError message={errorFor(errors, 'referenceImages')} />
          </div>
        </>
      )}

      <div>
        <label htmlFor="pe-deadline" className="text-sm font-medium">Deadline</label>
        <Input
          id="pe-deadline"
          type="date"
          className="mt-1 sm:max-w-56"
          min={today}
          value={state.deadline}
          aria-invalid={Boolean(errorFor(errors, 'deadline'))}
          onChange={(e) => patch({ deadline: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted">Every date is a whole day. Work is due by 23:59 that day, in your time zone.</p>
        <FieldError message={errorFor(errors, 'deadline')} />
      </div>

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">Milestones</legend>
        <ol className="mt-2 space-y-3">
          {state.rows.map((row, index) => {
            const status = statusOf(row.key)
            const existing = status !== undefined
            const closed = isRowClosed(status)
            const amountLocked = existing && status !== 'PENDING'
            const prefix = `rows.${row.key}`
            const titleError = errorFor(errors, `${prefix}.title`)
            const dateError = errorFor(errors, `${prefix}.dueDate`)
            const amountError = errorFor(errors, `${prefix}.amount`)
            const descError = errorFor(errors, `${prefix}.description`)
            const prevLocked = index > 0 && statusOf(state.rows[index - 1].key) !== undefined
            return (
              <li key={row.key} className={cn('rounded-lg border bg-surface p-3', closed ? 'border-border bg-surface-muted' : 'border-border')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Milestone {index + 1}</p>
                  {existing ? null : (
                    <div className="flex items-center">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move milestone ${index + 1} up`} disabled={index === 0 || prevLocked} onClick={() => moveRow(index, -1)}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move milestone ${index + 1} down`} disabled={index === state.rows.length - 1} onClick={() => moveRow(index, 1)}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Remove milestone ${index + 1}`} disabled={state.rows.length <= 1} onClick={() => removeRow(row.key)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_8rem]">
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-muted" htmlFor={`pe-title-${row.key}`}>Title</label>
                    <Input id={`pe-title-${row.key}`} maxLength={120} value={row.title} readOnly={existing} aria-invalid={Boolean(titleError)} onChange={(e) => patchRow(row.key, { title: e.target.value })} />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-muted" htmlFor={`pe-date-${row.key}`}>Due date</label>
                    <Input id={`pe-date-${row.key}`} type="date" min={today} value={row.dueDate} readOnly={closed} aria-invalid={Boolean(dateError)} onChange={(e) => patchRow(row.key, { dueDate: e.target.value })} />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs font-medium text-muted" htmlFor={`pe-amount-${row.key}`}>Amount (credits)</label>
                    <Input
                      id={`pe-amount-${row.key}`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={row.amount}
                      readOnly={amountLocked}
                      aria-invalid={Boolean(amountError)}
                      onChange={(e) => patchRow(row.key, { amount: e.target.value.replace(/[^\d]/g, '') })}
                    />
                  </div>
                </div>

                {existing ? null : (
                  <div className="mt-3">
                    <label className="text-xs font-medium text-muted" htmlFor={`pe-desc-${row.key}`}>What is delivered <span className="font-normal">(optional)</span></label>
                    <Textarea id={`pe-desc-${row.key}`} className="min-h-16" maxLength={2000} value={row.description} aria-invalid={Boolean(descError)} onChange={(e) => patchRow(row.key, { description: e.target.value })} />
                  </div>
                )}

                {closed ? <p className="mt-2 text-xs text-muted">This milestone can no longer change.</p> : null}
                {amountLocked && !closed ? <p className="mt-2 text-xs text-muted">Already funded: only the due date can change.</p> : null}
                {[titleError, dateError, amountError, descError].filter(Boolean).map((message) => (
                  <FieldError key={message} message={message} />
                ))}
              </li>
            )
          })}
        </ol>
        <FieldError message={errorFor(errors, 'milestones')} />
        <Button type="button" variant="secondary" size="sm" className="mt-3" disabled={state.rows.length >= MAX_MILESTONES} onClick={addRow}>
          <Plus className="h-4 w-4" /> Add milestone
        </Button>
      </fieldset>

      <p className="text-base font-medium" aria-live="polite">Total: {credits(total)}</p>

      {serverError ? <p role="alert" className="break-words text-sm text-danger">{serverError}</p> : null}

      <div>
        <Button type="submit" loading={pending} disabled={blocked} className="w-full sm:w-auto">
          {submitLabel ?? defaultLabels[mode]}
        </Button>
        {errors.length ? <p className="mt-2 text-xs text-muted">Not ready yet: {errors[0].message}</p> : null}
      </div>
    </form>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p role="alert" className="mt-1 break-words text-xs text-danger">{message}</p>
}

/** The reference links: one box per link, add and remove. Empty boxes are dropped when the proposal is sent. */
function LinkList({ links, error, onChange }: { links: string[]; error?: string; onChange: (links: string[]) => void }) {
  return (
    <div>
      <p className="text-sm font-medium">Reference links <span className="font-normal text-muted">(optional, up to 10)</span></p>
      <ul className="mt-2 space-y-2">
        {links.map((link, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              type="url"
              inputMode="url"
              aria-label={`Reference link ${i + 1}`}
              placeholder="https://"
              value={link}
              onChange={(e) => onChange(links.map((l, j) => (j === i ? e.target.value : l)))}
            />
            <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(links.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <FieldError message={error} />
      <Button type="button" variant="secondary" size="sm" className="mt-2" disabled={links.length >= MAX_REFERENCES} onClick={() => onChange([...links, ''])}>
        <Plus className="h-4 w-4" /> Add link
      </Button>
    </div>
  )
}
