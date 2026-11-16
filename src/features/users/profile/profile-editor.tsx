'use client'

import type { ReactNode } from 'react'
import { Edit3 } from 'lucide-react'
import { toast } from 'sonner'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { cn } from '@/shared/lib/utils'

export function InlineEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-bold uppercase tracking-[0.12em] text-foreground transition hover:border-primary hover:text-primary"
      onClick={onClick}
    >
      <Edit3 className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

export function OwnerUploadButton({
  label,
  icon,
  className,
  disabled,
  loading = false,
  onChange,
}: {
  label: string
  icon: ReactNode
  className?: string
  disabled?: boolean
  loading?: boolean
  onChange: (file: File) => void
}) {
  return (
    <label aria-busy={loading} className={cn('interaction inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-within:ring-2 focus-within:ring-primary-bright', className, loading && 'pointer-events-none !opacity-100')}>
      {loading ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : icon}
      {label}
      <input
        className="sr-only"
        type="file"
        accept={imageUploadAccept}
        disabled={disabled || loading}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            const validation = validateImageFile(file, { label })
            if (validation.valid) onChange(file)
            else toast.error(validation.message)
          }
          event.target.value = ''
        }}
      />
    </label>
  )
}

export function ResumeSnippet({ title, value }: { title: string; value?: string | null }) {
  if (!value) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm text-muted">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
        Not added yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <p className="line-clamp-5 text-sm leading-6 text-muted">{value}</p>
    </div>
  )
}
