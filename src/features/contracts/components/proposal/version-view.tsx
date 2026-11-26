import Image from 'next/image'
import { formatPipelineDay } from '@/features/hiring-pipeline/utils/format-time'
import { credits } from '@/shared/lib/credits'
import type { ProposalVersionView } from '@/shared/schemas'

/** The host of a link ("example.com"), so a long address does not fill the panel. */
function linkLabel(link: string): string {
  try {
    return new URL(link).host
  } catch {
    return link
  }
}

/** One version of a proposal: brief, references, the milestones and the total. */
export function VersionView({ version }: { version: ProposalVersionView }) {
  return (
    <div>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{version.brief}</p>

      {version.referenceLinks.length ? (
        <ul className="mt-3 space-y-1" aria-label="Reference links">
          {version.referenceLinks.map((link) => (
            <li key={link} className="min-w-0 text-sm">
              <a href={link} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-primary hover:underline">{linkLabel(link)}</a>
            </li>
          ))}
        </ul>
      ) : null}
      {version.referenceImages.length ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Reference images">
          {version.referenceImages.map((url, i) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">
                <Image src={url} alt={`Reference image ${i + 1}, opens full size`} width={80} height={80} className="h-20 w-20 object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      <table className="mt-4 w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">Milestones</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th scope="col" className="w-8 py-2 pr-2 font-medium">#</th>
            <th scope="col" className="py-2 pr-2 font-medium">Milestone</th>
            <th scope="col" className="w-24 py-2 pr-2 font-medium sm:w-28">Due</th>
            <th scope="col" className="w-24 py-2 text-right font-medium sm:w-28">Amount</th>
          </tr>
        </thead>
        <tbody>
          {version.milestones.map((m, i) => (
            <tr key={i} className="border-b border-border align-top last:border-0">
              <td className="py-2 pr-2 tabular-nums text-muted">{i + 1}</td>
              <td className="break-words py-2 pr-2">
                <span className="font-medium">{m.title}</span>
                {m.description ? <span className="mt-0.5 block whitespace-pre-wrap text-xs text-muted">{m.description}</span> : null}
              </td>
              <td className="py-2 pr-2">{formatPipelineDay(m.dueDate)}</td>
              <td className="py-2 text-right tabular-nums">{credits(m.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <th scope="row" colSpan={3} className="py-2 pr-2 text-left font-medium">Total · deadline {formatPipelineDay(version.deadline)}</th>
            <td className="py-2 text-right font-semibold tabular-nums">{credits(version.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
