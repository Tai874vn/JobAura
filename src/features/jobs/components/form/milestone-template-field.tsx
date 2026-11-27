'use client'

/**
 * Part of the service job creation and edit form. Lets a freelancer define optional default milestone steps with percentage shares that add up to 100%.
 *
 * Calls: blankTemplateRow; templateErrors; templateShareTotal; errorForField
 * Used by:
 *   - features/jobs/components/form/job-form.tsx
 */

import { Plus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { Button, Input } from '@/shared/ui'
import {
  MAX_TEMPLATE_ROWS,
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_TITLE_MAX,
  blankTemplateRow,
  errorForField,
  templateErrors,
  templateShareTotal,
  type TemplateRow,
} from '../../utils/milestone-template'

/**
 * The seller's usual steps (for example Sketch 30%, Build 50%, Polish 20%). A client's proposal starts from these.
 * No rows means no template. The shares must add up to 100.
 */
export function MilestoneTemplateField({ rows, onChange }: { rows: TemplateRow[]; onChange: (rows: TemplateRow[]) => void }) {
  const nextKey = useRef(1)
  const errors = templateErrors(rows)
  const total = templateShareTotal(rows)

  const patchRow = (key: string, change: Partial<TemplateRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...change } : r)))

  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-medium">How the work is usually split <span className="font-normal text-muted">(optional)</span></legend>
      <p className="mt-1 text-xs text-muted">Clients start their proposal from these steps. Each step is a share of the price, in whole percent.</p>
      {rows.length ? (
        <ol className="mt-3 space-y-3">
          {rows.map((row, index) => {
            const titleError = errorForField(errors, `rows.${row.key}.title`)
            const shareError = errorForField(errors, `rows.${row.key}.share`)
            const descriptionError = errorForField(errors, `rows.${row.key}.description`)
            return (
              <li key={row.key} className="rounded-lg border border-border p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-start">
                  <div className="min-w-0">
                    <label htmlFor={`mt-title-${row.key}`} className="text-xs font-medium text-muted">Step {index + 1} title</label>
                    <Input id={`mt-title-${row.key}`} className="mt-1" maxLength={TEMPLATE_TITLE_MAX + 20} value={row.title} aria-invalid={Boolean(titleError)} onChange={(e) => patchRow(row.key, { title: e.target.value })} placeholder="Sketch" />
                    {titleError ? <p className="mt-1 text-xs text-danger">{titleError}</p> : null}
                  </div>
                  <div>
                    <label htmlFor={`mt-share-${row.key}`} className="text-xs font-medium text-muted">Share (%)</label>
                    <Input id={`mt-share-${row.key}`} className="mt-1" inputMode="numeric" value={row.share} aria-invalid={Boolean(shareError)} onChange={(e) => patchRow(row.key, { share: e.target.value })} placeholder="30" />
                    {shareError ? <p className="mt-1 text-xs text-danger">{shareError}</p> : null}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="sm:mt-5" aria-label={`Remove step ${index + 1}`} onClick={() => onChange(rows.filter((r) => r.key !== row.key))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2">
                  <label htmlFor={`mt-desc-${row.key}`} className="text-xs font-medium text-muted">Description <span className="font-normal">(optional)</span></label>
                  <Input id={`mt-desc-${row.key}`} className="mt-1" maxLength={TEMPLATE_DESCRIPTION_MAX + 50} value={row.description} aria-invalid={Boolean(descriptionError)} onChange={(e) => patchRow(row.key, { description: e.target.value })} placeholder="What the client gets at this step" />
                  {descriptionError ? <p className="mt-1 text-xs text-danger">{descriptionError}</p> : null}
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={rows.length >= MAX_TEMPLATE_ROWS}
          onClick={() => onChange([...rows, blankTemplateRow(`n${nextKey.current++}`)])}
        >
          <Plus className="h-4 w-4" /> Add a step
        </Button>
        {rows.length ? (
          <p className={total === 100 ? 'text-sm text-muted' : 'text-sm font-medium text-danger'} aria-live="polite">
            Shares: {total} of 100%
          </p>
        ) : (
          <p className="text-xs text-muted">No steps: clients will see one step, &ldquo;Full work&rdquo;.</p>
        )}
      </div>
      {rows.length > MAX_TEMPLATE_ROWS ? <p className="mt-1 text-xs text-danger">{errorForField(errors, 'rows')}</p> : null}
    </fieldset>
  )
}
