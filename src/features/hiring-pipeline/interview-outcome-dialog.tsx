'use client'

import { X } from 'lucide-react'
import { useEffect, useId } from 'react'
import { Button } from '@/shared/ui'

export type OutcomeChoice = 'offer' | 'round' | 'reject' | 'later'

/**
 * Shown after an interview is done (Skip, Mark as done, or back from the call): "How did it go?".
 * Each choice only picks the next step; the panel opens the matching dialog. "Decide later" just closes.
 */
export function InterviewOutcomeDialog({
  open,
  name,
  noOpeningsLeft,
  onChoose,
}: {
  open: boolean
  name: string
  /** True when every opening is taken: the offer button is off and says why. */
  noOpeningsLeft: boolean
  onChoose: (choice: OutcomeChoice) => void
}) {
  if (!open) return null
  return <OutcomeBody name={name} noOpeningsLeft={noOpeningsLeft} onChoose={onChoose} />
}

function OutcomeBody({ name, noOpeningsLeft, onChoose }: { name: string; noOpeningsLeft: boolean; onChoose: (choice: OutcomeChoice) => void }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onChoose('later')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onChoose])

  return (
    <div
      className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onChoose('later')
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
        <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={() => onChoose('later')} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <h2 id={titleId} className="pr-10 font-display text-lg font-medium">How did it go?</h2>
        <p className="mt-1 text-sm leading-6 text-muted">The interview with {name} is marked as done.</p>
        <div className="mt-5 grid gap-2">
          <Button type="button" disabled={noOpeningsLeft} onClick={() => onChoose('offer')}>Send offer</Button>
          {noOpeningsLeft ? <p className="text-sm text-muted">No openings left · withdraw an offer to send another</p> : null}
          <Button type="button" variant="secondary" onClick={() => onChoose('round')}>Another round</Button>
          <Button type="button" variant="danger" onClick={() => onChoose('reject')}>Reject</Button>
          <Button type="button" variant="ghost" onClick={() => onChoose('later')}>Decide later</Button>
        </div>
      </section>
    </div>
  )
}
