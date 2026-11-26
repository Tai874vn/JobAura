import Link from 'next/link'
import type { LedgerEntryView } from '@/shared/schemas'
import { credits } from '@/shared/lib/credits'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { ledgerAmount, ledgerText } from './ledger-text'

/** One line of the ledger: date, a sentence (a link to the contract when there is one), the change and the balance after. */
export function LedgerRow({ entry }: { entry: LedgerEntryView }) {
  const text = ledgerText(entry)
  const change = entry.availableDelta !== 0 ? entry.availableDelta : entry.heldDelta
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-xs text-muted">{formatPipelineDay(entry.createdAt)}</p>
        {entry.contract ? (
          <Link href={`/contracts?contract=${entry.contract.id}`} className="break-words text-sm font-medium text-primary hover:underline">{text}</Link>
        ) : (
          <p className="break-words text-sm font-medium text-foreground">{text}</p>
        )}
      </div>
      {/* On a phone the amount drops under the sentence and lines up on the left; on wider screens it sits on the right. */}
      <div className="w-full sm:w-auto sm:text-right">
        <p className={change > 0 ? 'text-sm font-medium text-primary' : 'text-sm font-medium text-foreground'}>{ledgerAmount(entry)}</p>
        <p className="text-xs text-muted">Balance {credits(entry.availableAfter)}</p>
      </div>
    </li>
  )
}
