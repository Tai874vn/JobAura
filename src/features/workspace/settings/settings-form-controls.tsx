import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import type { ProfilePortfolioItem } from '@/shared/schemas'
import { Button, Card, CardContent, Input, Textarea } from '@/shared/ui'

export type PortfolioDraft = Omit<ProfilePortfolioItem, 'id'>

export function EditorSection({
  title,
  children,
  onAdd,
  onSave,
  saveLabel = 'Save',
  hideActions = false,
  saving = false,
  focusId,
}: {
  /** Target for profile strength links (`?focus=`). */
  focusId?: string
  title: string
  children: React.ReactNode
  onAdd?: () => void
  onSave?: () => void
  saveLabel?: string
  hideActions?: boolean
  saving?: boolean
}) {
  return (
    <Card data-focus={focusId}>
      <CardContent className="p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {!hideActions ? (
            <div className="ml-auto flex gap-2">
              {onAdd ? (
                <Button variant="secondary" size="sm" onClick={onAdd}>
                  <Plus className="h-4 w-4" />Add
                </Button>
              ) : null}
              {onSave ? <Button size="sm" loading={saving} onClick={onSave}>{saveLabel}</Button> : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3">{children}</div>
      </CardContent>
    </Card>
  )
}

export function Field({ label, value, onChange, type = 'text', className, focusId }: {
  focusId?: string
  label: string
  value?: string | null
  onChange: (value: string) => void
  type?: string
  className?: string
}) {
  return (
    <label data-focus={focusId} className={`grid gap-1 ${className ?? ''}`}>
      <span className="text-sm font-semibold">{label}</span>
      <Input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function PortfolioFields({ item, onChange }: { item: PortfolioDraft; onChange: (patch: Partial<PortfolioDraft>) => void }) {
  return (
    <>
      <Field label="Project title" value={item.title} onChange={(title) => onChange({ title })} />
      <label className="grid gap-1"><span className="text-sm font-semibold">Description</span><Textarea value={item.description ?? ''} onChange={(event) => onChange({ description: event.target.value })} /></label>
      <Field label="Image URL" value={item.image} onChange={(image) => onChange({ image })} />
      <Field label="Project URL" value={item.url} onChange={(url) => onChange({ url })} />
    </>
  )
}

export function UploadField({ label, icon, onChange, pending = false }: { label: string; icon: React.ReactNode; onChange: (file: File) => void; pending?: boolean }) {
  return (
    <label aria-busy={pending} className="interaction inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 text-sm font-semibold text-muted hover:border-primary hover:bg-primary/5 hover:text-primary focus-within:ring-2 focus-within:ring-primary-bright">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      <span role={pending ? 'status' : undefined}>{pending ? label.replace(/^Upload /, 'Uploading ') + '…' : label}</span>
      <input
        className="sr-only"
        type="file"
        aria-label={label}
        disabled={pending}
        accept={imageUploadAccept}
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

export function IconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}><Trash2 className="h-4 w-4" /></Button>
}
