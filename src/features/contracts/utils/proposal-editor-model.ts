import { contractsConfig } from '@/page-config/contracts'
import { credits } from '@/shared/lib/credits'
import type { MilestoneStatus, ProposalVersionView, VersionBody } from '@/shared/schemas'

/** One step of the service's milestone template: the share is a whole percent, and all shares add up to 100. */
export type Template = { title: string; description?: string | null; share: number }[]

export type EditorRow = {
  /** Only for React and for matching a row to a milestone; never sent. */
  key: string
  title: string
  description: string
  /** yyyy-mm-dd, a whole day in the viewer's own time zone. */
  dueDate: string
  /** What the person typed; whole credits. */
  amount: string
}

export type EditorState = {
  brief: string
  referenceLinks: string[]
  referenceImages: string[]
  /** yyyy-mm-dd */
  deadline: string
  rows: EditorRow[]
}

export type EditorError = { field: string; message: string }

/** Set in src/page-config/contracts.ts (proposal). */
export const MAX_MILESTONES = contractsConfig.proposal.maxMilestones
export const MAX_AMOUNT = contractsConfig.proposal.maxAmount
export const MAX_REFERENCES = contractsConfig.proposal.maxReferences

const two = (n: number) => String(n).padStart(2, '0')

/** A Date as yyyy-mm-dd using the viewer's own calendar day. */
export function toDayString(date: Date): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`
}

/** Today as yyyy-mm-dd (the screen passes this in, so the pure functions below stay easy to test). */
export function todayString(now: Date = new Date()): string {
  return toDayString(now)
}

// Calendar days are counted in UTC so a daylight-saving change never moves a day.
function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

function dayFromNumber(n: number): string {
  return new Date(n * 86_400_000).toISOString().slice(0, 10)
}

const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export function addDays(day: string, n: number): string {
  return dayFromNumber(dayNumber(day) + n)
}

/** 23:59 local time of that day, as a Date. */
function endOfDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 0, 0)
}

/** The price cut by whole-percent shares: each is floored, and the left-over credits go to the last one, so the parts add up to the price. */
export function splitPrice(price: number, shares: number[]): number[] {
  const whole = Math.max(0, Math.floor(price))
  const amounts = shares.map((share) => Math.floor((whole * share) / 100))
  if (amounts.length) amounts[amounts.length - 1] += whole - amounts.reduce((sum, a) => sum + a, 0)
  return amounts
}

/**
 * The rows a client starts from when they send a proposal for a service:
 * - the price is split by the template shares: floor(price x share / 100), and the left-over credits go to the last
 *   row, so the rows always add up to the price exactly (price 0 leaves the amounts empty);
 * - due dates are spread evenly from tomorrow to the deadline, and the last row falls on the deadline.
 * With no template there is one row, "Full work".
 */
export function prefillFromService(
  job: { price: number; milestoneTemplate: Template | null },
  deadline: string,
  today: string,
): EditorRow[] {
  const steps: Template = job.milestoneTemplate?.length
    ? job.milestoneTemplate
    : [{ title: 'Full work', description: '', share: 100 }]
  const price = Math.max(0, Math.floor(job.price))
  const amounts = splitPrice(price, steps.map((step) => step.share))

  const tomorrow = dayNumber(addDays(today, 1))
  const last = isDay(deadline) ? dayNumber(deadline) : tomorrow
  const span = Math.max(0, last - tomorrow)

  return steps.map((step, i) => {
    const isLast = i === steps.length - 1
    // Step i of n sits at tomorrow + span x (i + 1) / n, never past the deadline.
    const at = isLast ? last : Math.min(last, tomorrow + Math.round((span * (i + 1)) / steps.length))
    return {
      key: `t${i + 1}`,
      title: step.title,
      description: step.description ?? '',
      dueDate: dayFromNumber(at),
      amount: price === 0 ? '' : String(amounts[i]),
    }
  })
}

/** What a row counts for: a whole number; anything else (empty, text, decimals) counts as 0. */
function amountOf(row: EditorRow): number {
  const text = row.amount.replace(/[,\s]/g, '')
  if (!/^\d+$/.test(text)) return 0
  return Number(text)
}

/** The live total. Empty or unreadable rows count as 0, so typing never makes the total jump. */
export function editorTotal(rows: EditorRow[]): number {
  return rows.reduce((sum, row) => sum + amountOf(row), 0)
}

const isWebLink = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** SUBMITTED, APPROVED and CANCELLED milestones are fully read-only in an amendment. */
export function isRowClosed(status: MilestoneStatus | undefined): boolean {
  return status === 'SUBMITTED' || status === 'APPROVED' || status === 'CANCELLED'
}

export type EditorCheckOptions = {
  /** Rows that cannot change (amendment mode): no error is ever shown on them. */
  closedKeys?: ReadonlySet<string>
  /** Rows of cancelled milestones: left out completely (the server leaves them out of the date order too). */
  cancelledKeys?: ReadonlySet<string>
  /**
   * Amendment mode: the due date each existing row had when the editor opened, by row key. Giving this switches to the
   * server's change-request rules: only a new or moved date must be in the future, and the date order also counts
   * the closed (SUBMITTED, APPROVED) rows.
   */
  originalDates?: Readonly<Record<string, string>>
}

/**
 * Checks a proposal (or a contract change) the same way the server does (same sentences), and says which field is wrong.
 * `field` is `brief`, `deadline`, `milestones`, `referenceLinks`, or `rows.<key>.<title|dueDate|amount>`.
 * For a new proposal a first due date of today is refused too (the form asks for tomorrow or later).
 */
export function editorErrors(s: EditorState, today: string, opts: EditorCheckOptions = {}): EditorError[] {
  const errors: EditorError[] = []
  const add = (field: string, message: string) => errors.push({ field, message })
  const amendment = opts.originalDates !== undefined

  if (!s.brief.trim()) add('brief', 'Brief is required.')
  else if (s.brief.length > 5000) add('brief', 'The brief can be up to 5000 characters.')

  if (s.referenceLinks.some((link) => link.trim() && !isWebLink(link.trim()))) {
    add('referenceLinks', 'referenceLinks must be web links.')
  } else if (s.referenceLinks.filter((l) => l.trim()).length > MAX_REFERENCES) {
    add('referenceLinks', 'Add up to 10 links.')
  }
  if (s.referenceImages.length > MAX_REFERENCES) add('referenceImages', 'Add up to 10 images.')

  if (!isDay(s.deadline)) add('deadline', 'Pick a deadline.')

  if (s.rows.length > MAX_MILESTONES) {
    add('milestones', amendment ? 'A contract has up to 20 milestones.' : 'A proposal has 1 to 20 milestones.')
  } else if (s.rows.length < 1) {
    add('milestones', 'A proposal has 1 to 20 milestones.')
  }

  let previous: string | null = null
  let firstChecked = true
  for (const row of s.rows) {
    if (opts.cancelledKeys?.has(row.key)) continue
    const closed = opts.closedKeys?.has(row.key) ?? false
    // A closed row only takes part in the date order (it sets `previous`); it never shows an error.
    const field = (name: string) => `rows.${row.key}.${name}`
    const report = (name: string, message: string) => {
      if (!closed) add(field(name), message)
    }

    if (!row.title.trim()) report('title', 'Each milestone needs a title.')
    else if (row.title.length > 120) report('title', 'A title can be up to 120 characters.')
    if (row.description.length > 2000) report('description', 'A description can be up to 2000 characters.')

    const amount = amountOf(row)
    if (amount < 1) report('amount', 'Each milestone is at least 1 credit.')
    else if (amount > MAX_AMOUNT) report('amount', `A milestone can be up to ${credits(MAX_AMOUNT)}.`)

    if (!isDay(row.dueDate)) {
      report('dueDate', 'Pick a due date.')
      continue
    }
    const changed = opts.originalDates?.[row.key] !== row.dueDate
    if (amendment) {
      if (changed && row.dueDate <= today) report('dueDate', 'A new due date must be in the future.')
      else if (previous && row.dueDate < previous) report('dueDate', 'Milestone due dates must be in order.')
      else if (isDay(s.deadline) && row.dueDate > s.deadline) report('dueDate', 'A due date cannot be after the deadline.')
    } else if (firstChecked && row.dueDate <= today) {
      report('dueDate', 'The first due date must be in the future.')
    } else if (previous && row.dueDate < previous) {
      report('dueDate', 'Milestone due dates must be in order.')
    } else if (isDay(s.deadline) && row.dueDate > s.deadline) {
      report('dueDate', 'A due date cannot be after the deadline.')
    }
    previous = row.dueDate
    firstChecked = false
  }
  return errors
}

/** The message for one field, or undefined. */
export function errorFor(errors: EditorError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message
}

/** The body the server wants. Every date is sent as 23:59 local time of that day, written as ISO (UTC) text. */
export function toVersionBody(s: EditorState): VersionBody {
  return {
    brief: s.brief.trim(),
    referenceLinks: s.referenceLinks.map((l) => l.trim()).filter(Boolean),
    referenceImages: s.referenceImages,
    deadline: endOfDay(s.deadline).toISOString(),
    milestones: s.rows.map((row) => ({
      title: row.title.trim(),
      ...(row.description.trim() ? { description: row.description.trim() } : {}),
      dueDate: endOfDay(row.dueDate).toISOString(),
      amount: amountOf(row),
    })),
  }
}

/** Starts the editor from an earlier version (for a counter-offer). */
export function fromVersion(v: ProposalVersionView): EditorState {
  return {
    brief: v.brief,
    referenceLinks: [...v.referenceLinks],
    referenceImages: [...v.referenceImages],
    deadline: toDayString(new Date(v.deadline)),
    rows: v.milestones.map((m, i) => ({
      key: `v${i + 1}`,
      title: m.title,
      description: m.description ?? '',
      dueDate: toDayString(new Date(m.dueDate)),
      amount: String(m.amount),
    })),
  }
}

/** A blank row for the "Add milestone" button. */
export function blankRow(key: string, dueDate = ''): EditorRow {
  return { key, title: '', description: '', dueDate, amount: '' }
}
