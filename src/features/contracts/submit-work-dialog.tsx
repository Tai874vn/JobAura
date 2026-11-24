'use client'

import { ImagePlus, Plus, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DialogPortal } from '@/features/hiring-pipeline/dialog-portal'
import { imageUploadAccept } from '@/shared/lib/file-validation'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, Input, Textarea } from '@/shared/ui'
import { contractsApi } from './api'

export const MAX_WORK_FILES = 10
export const MAX_NOTE = 2000

export type WorkBody = { note: string; images: string[]; links: string[] }

const isWebLink = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** The same checks as the server: a note of 1 to 2000 characters, up to 10 images, up to 10 web links. Empty link boxes are ignored. */
export function submitWorkErrors(w: WorkBody): string[] {
  const errors: string[] = []
  const note = w.note.trim()
  if (!note) errors.push('Write a note about the work.')
  else if (note.length > MAX_NOTE) errors.push('note must be 1 to 2000 characters.')
  if (w.images.length > MAX_WORK_FILES) errors.push('Add up to 10 images.')
  const links = w.links.map((l) => l.trim()).filter(Boolean)
  if (links.length > MAX_WORK_FILES) errors.push('Add up to 10 links.')
  if (links.some((l) => !isWebLink(l))) errors.push('Links must start with http:// or https://.')
  return errors
}

/** The body sent to the server: the note trimmed, empty link boxes dropped. */
export function workBody(w: WorkBody): WorkBody {
  return { note: w.note.trim(), images: w.images, links: w.links.map((l) => l.trim()).filter(Boolean) }
}

/**
 * The freelancer sends the work for a milestone: a note (required), images (uploaded here) and links.
 * A refusal from the server shows inside the dialog, with what was typed kept.
 */
export function SubmitWorkDialog({
  milestoneLabel,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  /** For example "Milestone 2: Colour versions". */
  milestoneLabel: string
  pending: boolean
  error: string | null
  onSubmit: (body: WorkBody) => void
  onClose: () => void
}) {
  const titleId = useId()
  const [work, setWork] = useState<WorkBody>({ note: '', images: [], links: [] })
  const [uploading, setUploading] = useState(false)
  const [noteTouched, setNoteTouched] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const errors = submitWorkErrors(work)
  const busy = pending || uploading

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        if (work.images.length + urls.length >= MAX_WORK_FILES) {
          toast.error('You can add up to 10 images.')
          break
        }
        try {
          urls.push((await contractsApi.uploadImage(file)).url)
        } catch (uploadError) {
          toast.error(getErrorMessage(uploadError, 'Could not upload this image.'))
        }
      }
      if (urls.length) setWork((w) => ({ ...w, images: [...w.images, ...urls] }))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const noteError = noteTouched ? errors.find((e) => e.startsWith('Write') || e.startsWith('note')) : undefined
  const linkError = errors.find((e) => e.startsWith('Links') || e.startsWith('Add up to 10 links'))

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) onClose()
        }}
      >
        <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={busy} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Submit work</h2>
          <p className="mt-1 break-words text-sm leading-6 text-muted">{milestoneLabel}. The client reviews it, then approves or asks for changes.</p>

          <form
            noValidate
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setNoteTouched(true)
              if (!errors.length && !busy) onSubmit(workBody(work))
            }}
          >
            <label className="block text-sm font-medium">
              Note
              <Textarea
                className="mt-1 min-h-28 font-normal"
                maxLength={MAX_NOTE}
                value={work.note}
                aria-invalid={Boolean(noteError)}
                onBlur={() => setNoteTouched(true)}
                onChange={(e) => setWork((w) => ({ ...w, note: e.target.value }))}
                placeholder="What is in this delivery, and how to open it."
              />
            </label>
            {noteError ? <p role="alert" className="-mt-2 text-xs text-danger">{noteError}</p> : null}

            <div>
              <p className="text-sm font-medium">Images <span className="font-normal text-muted">(optional, up to 10)</span></p>
              {work.images.length ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {work.images.map((url, i) => (
                    <li key={url} className="relative">
                      <Image src={url} alt={`Image ${i + 1}`} width={80} height={80} className="h-20 w-20 rounded-md border border-border object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove image ${i + 1}`}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
                        onClick={() => setWork((w) => ({ ...w, images: w.images.filter((u) => u !== url) }))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input ref={fileInput} type="file" accept={imageUploadAccept} multiple hidden onChange={(e) => void onFiles(e.target.files)} />
              <Button type="button" variant="secondary" size="sm" className="mt-2" loading={uploading} disabled={work.images.length >= MAX_WORK_FILES} onClick={() => fileInput.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Add image
              </Button>
            </div>

            <div>
              <p className="text-sm font-medium">Links <span className="font-normal text-muted">(optional, up to 10)</span></p>
              <ul className="mt-2 space-y-2">
                {work.links.map((link, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Input
                      type="url"
                      inputMode="url"
                      aria-label={`Link ${i + 1}`}
                      placeholder="https://"
                      value={link}
                      onChange={(e) => setWork((w) => ({ ...w, links: w.links.map((l, j) => (j === i ? e.target.value : l)) }))}
                    />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label={`Remove link ${i + 1}`} onClick={() => setWork((w) => ({ ...w, links: w.links.filter((_, j) => j !== i) }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
              {linkError ? <p role="alert" className="mt-1 text-xs text-danger">{linkError}</p> : null}
              <Button type="button" variant="secondary" size="sm" className="mt-2" disabled={work.links.length >= MAX_WORK_FILES} onClick={() => setWork((w) => ({ ...w, links: [...w.links, ''] }))}>
                <Plus className="h-4 w-4" /> Add link
              </Button>
            </div>

            {error ? <p role="alert" className="break-words text-sm text-danger">{error}</p> : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" loading={pending} disabled={busy || (noteTouched && errors.length > 0) || Boolean(linkError)}>Submit work</Button>
            </div>
          </form>
        </section>
      </div>
    </DialogPortal>
  )
}
