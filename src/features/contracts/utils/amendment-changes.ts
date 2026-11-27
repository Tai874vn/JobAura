/**
 * Helper functions for contract change requests (amendments) in the contracts feature.
 * Builds the starting editor state, converts edits into the server payload, describes changes in plain words, and reads credit shortage messages.
 *
 * Calls: formatPipelineDay; credits; toDayString; toVersionBody
 * Used by:
 *   - features/contracts/components/contract/contract-panel.tsx
 *   - features/contracts/components/dialogs/amendment-dialog.tsx
 *   - features/contracts/components/dialogs/contract-dialogs.tsx
 *   - features/contracts/hooks/use-contract-actions.ts
 */

import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { credits } from '@/shared/lib/credits'
import type { AmendmentChange, ContractDetail, MilestoneStatus } from '@/shared/schemas'
import { toDayString, toVersionBody, type EditorState } from './proposal-editor-model'

/** What a change request sends (the note is added by the dialog). */
export type AmendmentBody = { deadline?: string; changes: AmendmentChange[] }

/** The editor row key of an existing milestone. New rows get other keys from the editor ("n1", "n2" ...). */
const rowKey = (milestoneId: number) => `m${milestoneId}`

/**
 * Where the change-request editor starts: the contract deadline and every milestone as it is now. Each existing
 * milestone is a locked row (the editor then lets only the allowed fields change: the due date on PENDING, FUNDED
 * and CHANGES_REQUESTED, the amount only on PENDING). `preset` starts one milestone with a lower amount
 * (from "Ask to lower the amount").
 */
export function amendmentStart(c: ContractDetail, preset?: { milestoneId: number; amount: number }) {
  const initial: EditorState = {
    brief: c.brief || c.title,
    referenceLinks: [],
    referenceImages: [],
    deadline: toDayString(new Date(c.deadline)),
    rows: c.milestones.map((m) => ({
      key: rowKey(m.id),
      title: m.title,
      description: m.description ?? '',
      dueDate: toDayString(new Date(m.dueDate)),
      amount: String(preset && preset.milestoneId === m.id && m.status === 'PENDING' ? preset.amount : m.amount),
    })),
  }
  const lockedRows: Record<string, MilestoneStatus> = Object.fromEntries(c.milestones.map((m) => [rowKey(m.id), m.status]))
  return { initial, lockedRows }
}

/**
 * The change set the server wants, from what the editor holds now compared with the contract:
 * a `move` for each existing milestone whose day changed, an `amount` for each PENDING one whose amount changed,
 * an `add` for each new row (they always sit at the end), and `deadline` when the deadline day changed.
 * Dates go out as 23:59 local time of the day, written as ISO (UTC) text, the same as a proposal.
 */
export function buildAmendment(c: ContractDetail, state: EditorState): AmendmentBody {
  const body = toVersionBody(state)
  const byKey = new Map(c.milestones.map((m) => [rowKey(m.id), m]))
  const edits: AmendmentChange[] = []
  const adds: AmendmentChange[] = []

  state.rows.forEach((row, i) => {
    const sent = body.milestones[i]
    const m = byKey.get(row.key)
    if (!m) {
      adds.push({ op: 'add', title: sent.title, ...(sent.description ? { description: sent.description } : {}), dueDate: sent.dueDate, amount: sent.amount })
      return
    }
    if (row.dueDate !== toDayString(new Date(m.dueDate))) edits.push({ op: 'move', milestoneId: m.id, dueDate: sent.dueDate })
    if (m.status === 'PENDING' && sent.amount !== m.amount) edits.push({ op: 'amount', milestoneId: m.id, amount: sent.amount })
  })

  const deadlineMoved = state.deadline !== toDayString(new Date(c.deadline))
  return { ...(deadlineMoved ? { deadline: body.deadline } : {}), changes: [...edits, ...adds] }
}

/** The change request in words, e.g. "Milestone 2 due date: Tue 2 Dec → Fri 5 Dec", "Add milestone 4: Final files · 300 credits". */
export function describeAmendment(a: { deadline: string | null | undefined; changes: AmendmentChange[] }, c: ContractDetail): string[] {
  const lines: string[] = []
  if (a.deadline) lines.push(`Deadline: ${formatPipelineDay(c.deadline)} → ${formatPipelineDay(a.deadline)}`)
  let next = c.milestones.reduce((max, m) => Math.max(max, m.position), 0)
  for (const change of a.changes) {
    if (change.op === 'add') {
      next += 1
      lines.push(`Add milestone ${next}: ${change.title} · ${credits(change.amount)}`)
      continue
    }
    const m = c.milestones.find((x) => x.id === change.milestoneId)
    const name = m ? `Milestone ${m.position}` : 'A milestone'
    if (change.op === 'move') lines.push(`${name} due date: ${m ? `${formatPipelineDay(m.dueDate)} → ` : ''}${formatPipelineDay(change.dueDate)}`)
    else lines.push(`${name} amount: ${m ? `${credits(m.amount)} → ` : ''}${credits(change.amount)}`)
  }
  return lines
}

const SHORTAGE = /^You have ([\d,]+) credits?; this milestone needs ([\d,]+)\. Top up or ask to lower the amount\.$/

/** Reads the server's "too few credits to fund" sentence; null for any other sentence. */
export function creditsShortage(message: string | null | undefined): { available: number; needed: number } | null {
  const match = message ? SHORTAGE.exec(message.trim()) : null
  if (!match) return null
  const num = (text: string) => Number(text.replace(/,/g, ''))
  return { available: num(match[1]), needed: num(match[2]) }
}

/** The amount "Ask to lower the amount" starts from: what the client has now (null when that is 0 or unknown). */
export function lowerAmountFrom(message: string | null | undefined): number | null {
  const shortage = creditsShortage(message)
  return shortage && shortage.available >= 1 ? shortage.available : null
}
