import type { LedgerEntryView } from '@/shared/schemas'
import { credits } from '@/shared/lib/credits'

/**
 * One ledger row as a plain sentence. A release has two sides and the row itself tells which one it is:
 * the person who earns gets credits in "available" (so the delta is above 0), while the person who pays
 * only sees their "held" credits go down. So no viewer id is needed.
 */
export function ledgerText(entry: LedgerEntryView): string {
  const step = entry.milestone ? `milestone ${entry.milestone.position}` : 'a milestone'
  const who = entry.counterparty?.name
  switch (entry.type) {
    case 'SEED':
      return 'Starting credits'
    case 'TOP_UP':
      return 'Top up'
    case 'FUND_HOLD':
      return `Held for ${step}${entry.contract ? ` · ${entry.contract.title}` : ''}`
    case 'RELEASE':
      return entry.availableDelta > 0
        ? `Earned${who ? ` from ${who}` : ''} for ${step}`
        : `Paid${who ? ` to ${who}` : ''} for ${step}`
    case 'REFUND':
      return entry.milestone ? `Refund for ${step}` : 'Refund'
  }
}

/** The change shown on a row: the available change when it is not 0, else the held change. */
export function ledgerAmount(entry: LedgerEntryView): string {
  return credits(entry.availableDelta !== 0 ? entry.availableDelta : entry.heldDelta, { sign: true })
}
