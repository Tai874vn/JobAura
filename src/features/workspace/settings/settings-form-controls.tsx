import { Plus, Trash2 } from 'lucide-react'
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
}: {
  title: string
  children: React.ReactNode
  onAdd?: () => void
  onSave?: () => void
  saveLabel?: string
  hideActions?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted">{title}</h2>
          <div className="ml-auto flex gap-2">
            {onAdd ? (
              <Button variant="secondary" size="sm" onClick={onAdd}>
                <Plus className="h-4 w-4" />Add
              </Button>
            ) : null}
            {onSave ? <Button size="sm" onClick={onSave}>{saveLabel}</Button> : null}
          </div>
        </div>
        <div className="grid gap-3">{children}</div>
      </CardContent>
    </Card>
  )
}

export function Field({ label, value, onChange, type = 'text', className }: {
  label: string
  value?: string | null
  onChange: (value: string) => void
  type?: string
  className?: string
}) {
  return (
    <label className={`grid gap-1 ${className ?? ''}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>
      <Input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function PortfolioFields({ item, onChange }: { item: PortfolioDraft; onChange: (patch: Partial<PortfolioDraft>) => void }) {
  return (
    <>
      <Input value={item.title} placeholder="Project title" onChange={(event) => onChange({ title: event.target.value })} />
      <Textarea value={item.description ?? ''} placeholder="Description" onChange={(event) => onChange({ description: event.target.value })} />
      <Input value={item.image ?? ''} placeholder="Image URL" onChange={(event) => onChange({ image: event.target.value })} />
      <Input value={item.url ?? ''} placeholder="Project URL" onChange={(event) => onChange({ url: event.target.value })} />
    </>
  )
}

export function UploadField({ label, icon, onChange }: { label: string; icon: React.ReactNode; onChange: (file: File) => void }) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 text-sm font-semibold text-muted hover:border-primary hover:text-primary">
      {icon}
      {label}
      <input
        className="sr-only"
        type="file"
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
