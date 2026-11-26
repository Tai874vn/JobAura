import { credits } from '@/shared/lib/credits'
import type { ProposalVersionView } from '@/shared/schemas'
import { formatPipelineDay } from '@/features/hiring-pipeline/format-time'

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/**
 * What a version changed compared with the one before it, as short sentences for the panel.
 * The first version has nothing to compare, so it gives an empty list.
 */
export function describeVersionChange(previous: ProposalVersionView | undefined, next: ProposalVersionView): string[] {
  if (!previous) return []
  const out: string[] = []

  if (previous.total !== next.total) out.push(`Total ${credits(previous.total)} to ${credits(next.total)}`)
  if (previous.deadline !== next.deadline) out.push(`Deadline ${formatPipelineDay(previous.deadline)} to ${formatPipelineDay(next.deadline)}`)
  if (previous.brief.trim() !== next.brief.trim()) out.push('Brief changed')
  if (!sameList(previous.referenceLinks, next.referenceLinks) || !sameList(previous.referenceImages, next.referenceImages)) out.push('References changed')

  const a = previous.milestones
  const b = next.milestones
  if (a.length !== b.length) {
    out.push(`${count(a.length, 'milestone')} to ${count(b.length, 'milestone')}`)
  } else {
    b.forEach((m, i) => {
      const old = a[i]
      const parts: string[] = []
      if (old.title !== m.title) parts.push('renamed')
      if (old.amount !== m.amount) parts.push(`${credits(old.amount)} to ${credits(m.amount)}`)
      if (old.dueDate !== m.dueDate) parts.push(`due ${formatPipelineDay(old.dueDate)} to ${formatPipelineDay(m.dueDate)}`)
      if ((old.description ?? '') !== (m.description ?? '') && !parts.length) parts.push('description changed')
      if (parts.length) out.push(`Milestone ${i + 1}: ${parts.join(', ')}`)
    })
  }
  return out
}
