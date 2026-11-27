/**
 * Helpers for the optional milestone template and service area fields in the job form.
 * Converts saved templates to editable rows, validates step fields and 100% share totals, and builds the API payload.
 *
 * Calls: jobFormConfig
 * Used by:
 *   - features/jobs/components/form/job-form.tsx
 *   - features/jobs/components/form/milestone-template-field.tsx
 */

import { jobFormConfig } from '@/features/jobs/config/job-form'
import type { Job } from '@/shared/schemas'

/** One row of the template a seller fills in. The share is typed text, so a half-typed value can be shown and checked. */
export type TemplateRow = {
  /** Only for React; never sent. */
  key: string
  title: string
  description: string
  /** A whole percent, as typed. */
  share: string
}

export type TemplateError = { field: string; message: string }

/** Set in src/features/jobs/config/job-form.ts */
export const MAX_TEMPLATE_ROWS = jobFormConfig.milestoneTemplate.maxRows
export const TEMPLATE_TITLE_MAX = jobFormConfig.milestoneTemplate.titleMax
export const TEMPLATE_DESCRIPTION_MAX = jobFormConfig.milestoneTemplate.descriptionMax
export const SERVICE_AREA_MAX = jobFormConfig.serviceAreaMax

export const blankTemplateRow = (key: string): TemplateRow => ({ key, title: '', description: '', share: '' })

/** A share counts when it is a whole number from 1 to 100; anything else counts as 0. */
function shareOf(row: TemplateRow): number {
  const text = row.share.trim()
  if (!/^\d+$/.test(text)) return 0
  const n = Number(text)
  return n >= 1 && n <= 100 ? n : 0
}

/** The sum shown as "Shares: 90 of 100%". Rows with a wrong share count as 0. */
export function templateShareTotal(rows: TemplateRow[]): number {
  return rows.reduce((sum, row) => sum + shareOf(row), 0)
}

/**
 * What stops the template from being saved. `field` is `rows`, `total`, or `rows.<key>.<title|description|share>`.
 * An empty template is fine (it means "no template"). The server checks the same rules.
 */
export function templateErrors(rows: TemplateRow[]): TemplateError[] {
  if (!rows.length) return []
  const errors: TemplateError[] = []
  if (rows.length > MAX_TEMPLATE_ROWS) errors.push({ field: 'rows', message: `Use at most ${MAX_TEMPLATE_ROWS} steps.` })
  for (const row of rows) {
    const title = row.title.trim()
    if (!title) errors.push({ field: `rows.${row.key}.title`, message: 'Give this step a title.' })
    else if (title.length > TEMPLATE_TITLE_MAX) errors.push({ field: `rows.${row.key}.title`, message: `A title is at most ${TEMPLATE_TITLE_MAX} characters.` })
    if (row.description.trim().length > TEMPLATE_DESCRIPTION_MAX) {
      errors.push({ field: `rows.${row.key}.description`, message: `A description is at most ${TEMPLATE_DESCRIPTION_MAX} characters.` })
    }
    if (shareOf(row) === 0) errors.push({ field: `rows.${row.key}.share`, message: 'Use a whole percent from 1 to 100.' })
  }
  const total = templateShareTotal(rows)
  if (total !== 100) errors.push({ field: 'total', message: `Shares add up to ${total} of 100%.` })
  return errors
}

export function errorForField(errors: TemplateError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

/** The body sent to the server: null for no template, otherwise trimmed steps (no empty description). */
export function toTemplatePayload(rows: TemplateRow[]): { title: string; description?: string; share: number }[] | null {
  if (!rows.length) return null
  return rows.map((row) => {
    const description = row.description.trim()
    return { title: row.title.trim(), ...(description ? { description } : {}), share: shareOf(row) }
  })
}

/** Starts the form from a saved template. */
export function fromTemplate(template: Job['milestoneTemplate']): TemplateRow[] {
  return (template ?? []).map((step, i) => ({
    key: `t${i + 1}`,
    title: step.title,
    description: step.description ?? '',
    share: String(step.share),
  }))
}

/** The area is asked for when the work is not only remote; the server keeps at most 160 characters. */
export function serviceAreaError(mode: NonNullable<Job['workMode']>, area: string): string | undefined {
  const text = area.trim()
  if (text.length > SERVICE_AREA_MAX) return `The area is at most ${SERVICE_AREA_MAX} characters.`
  if (mode !== 'REMOTE' && !text) return 'Say where the work happens.'
  return undefined
}
