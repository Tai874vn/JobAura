'use client'

import { feedConfig } from '@/features/feed/config/feed'
import Image from 'next/image'
import Link from 'next/link'
import { BriefcaseBusiness, ImagePlus, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { UserProfile } from '@/shared/schemas'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { Button, Card } from '@/shared/ui'
import { FeedAvatar } from './feed-avatar'

/**
 * "Start a post" box on the feed. Opens a dialog with a text area and an optional image (with preview).
 * An empty post (no text, no image) is not sent; the parent (FeedPage) does the upload.
 */
export function PostComposer({
  user,
  submitting,
  onSubmit,
}: {
  user: UserProfile
  submitting: boolean
  onSubmit: (content: string, image?: File) => Promise<void>
}) {
  const inputId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [imageSelection, setImageSelection] = useState<{ file: File; preview: string }>()
  const image = imageSelection?.file
  const preview = imageSelection?.preview

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function openModal() {
    const dialog = dialogRef.current
    if (!dialog?.open) dialog?.showModal()
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function closeModal() {
    if (submitting) return
    dialogRef.current?.close()
  }

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!content.trim() && !image) return
    try {
      await onSubmit(content, image)
      setContent('')
      setImageSelection(undefined)
      if (fileRef.current) fileRef.current.value = ''
      dialogRef.current?.close()
    } catch {
      // The mutation displays the request error and keeps the draft open.
    }
  }

  function selectImage(file?: File) {
    if (!file) {
      setImageSelection(undefined)
      return
    }

    const validation = validateImageFile(file, { label: 'Post image' })
    if (!validation.valid) {
      toast.error(validation.message)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setImageSelection((current) => {
      if (current?.preview) URL.revokeObjectURL(current.preview)
      return { file, preview: URL.createObjectURL(file) }
    })
  }

  return (
    <>
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <FeedAvatar user={user} />
          <button
            type="button"
            onClick={openModal}
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface-muted px-4 text-left text-sm font-medium text-muted hover:border-primary hover:bg-surface hover:text-foreground"
          >
            Start a post
          </button>
        </div>
        <div className="mt-2 flex gap-1 border-t border-border pt-2">
          <button
            type="button"
            onClick={openModal}
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-primary"
          >
            <ImagePlus className="h-4 w-4 text-primary" /> Photo
          </button>
          <Link
            href="/jobs/new"
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-primary"
          >
            <BriefcaseBusiness className="h-4 w-4 text-primary" /> Post portfolio
          </Link>
        </div>
      </Card>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${inputId}-title`}
        onCancel={(event) => {
          if (submitting) event.preventDefault()
        }}
        className="motion-panel m-auto w-[min(640px,calc(100%-32px))] rounded-lg border border-border bg-surface p-0 text-foreground shadow-overlay backdrop:bg-black/45"
      >
        <form onSubmit={submit}>
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id={`${inputId}-title`} className="font-display text-lg font-medium">Create post</h2>
            <Button type="button" variant="ghost" size="icon" onClick={closeModal} disabled={submitting} title="Close post composer">
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div className="p-5">
            <div className="flex items-center gap-3">
              <FeedAvatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.headline || 'JobAura member'}</p>
              </div>
            </div>

            <label htmlFor={inputId} className="sr-only">Post content</label>
            <textarea
              ref={textareaRef}
              id={inputId}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={feedConfig.composerPlaceholder}
              maxLength={3000}
              rows={7}
              className="mt-4 min-h-44 w-full resize-none border-0 bg-transparent text-base leading-7 outline-none placeholder:text-muted"
            />

            {preview ? (
              <div className="relative mt-3 overflow-hidden rounded-lg border border-border bg-surface-muted">
                <Image src={preview} alt="Post image preview" width={900} height={600} unoptimized className="max-h-80 w-full object-contain" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 bg-surface/95"
                  onClick={() => setImageSelection(undefined)}
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept={imageUploadAccept}
              className="sr-only"
              onChange={(event) => {
                selectImage(event.target.files?.[0])
              }}
              id={`${inputId}-image`}
            />
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
            <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4 text-primary" /> Photo
            </Button>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted sm:inline">{content.length}/3000</span>
              <Button type="submit" loading={submitting} disabled={!content.trim() && !image}>
                <Send className="h-4 w-4" /> Post
              </Button>
            </div>
          </footer>
        </form>
      </dialog>
    </>
  )
}
