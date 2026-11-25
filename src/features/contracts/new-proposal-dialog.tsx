'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/lib/utils'
import type { Job } from '@/shared/schemas'
import { Button, DialogPortal, useDialogFocus } from '@/shared/ui'
import { contractsApi } from './api'
import { ProposalEditor } from './proposal-editor'
import { addDays, prefillFromService, todayString, type EditorState } from './proposal-editor-model'

type Props = {
  job: Job
  /** Called with the new proposal id after it was sent (the dialog then opens the proposal). */
  onSent?: (proposalId: number) => void
  onClose: () => void
}

/** The server sentence for a second open proposal on the same service. */
export const OPEN_PROPOSAL_SENTENCE = 'You already have an open proposal for this service.'
const serverSentence = (error: unknown) => getErrorMessage(error, '')

/** How many days from today the first deadline suggestion is. The client changes it freely. */
const DEFAULT_DEADLINE_DAYS = 14

/**
 * "Send a proposal" on a service page. The editor starts from the service price and its template (see
 * `prefillFromService`). After sending, the client lands on the proposal in their contracts page.
 */
export function NewProposalDialog({ job, onSent, onClose }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const titleId = useId()
  const descId = useId()
  const [initial] = useState<EditorState>(() => {
    const today = todayString()
    const deadline = addDays(today, DEFAULT_DEADLINE_DAYS)
    return {
      brief: '',
      referenceLinks: [],
      referenceImages: [],
      deadline,
      rows: prefillFromService({ price: job.price, milestoneTemplate: job.milestoneTemplate ?? null }, deadline, today),
    }
  })

  const mutation = useMutation({
    mutationFn: (body: Parameters<typeof contractsApi.propose>[0]) => contractsApi.propose(body),
    onSuccess: (proposal) => {
      void queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Proposal sent')
      onSent?.(proposal.id)
      router.push(`/contracts?tab=client&proposal=${proposal.id}`)
    },
  })

  // Focus moves into the dialog, Tab stays inside, Escape closes (not while sending), focus goes back on close.
  const dialogRef = useDialogFocus(onClose, !mutation.isPending)

  const error = mutation.error
  // The server sentence is shown here, in the dialog. For "already open" the client can go and read that proposal.
  const alreadyOpen = error instanceof AxiosError && error.response?.status === 409 && serverSentence(error) === OPEN_PROPOSAL_SENTENCE
  const serverError = error ? getErrorMessage(error, 'Could not send the proposal. Please try again.') : null

  return (
    <DialogPortal>
      <div
        className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/45 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !mutation.isPending) onClose()
        }}
      >
        <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} className="motion-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface p-5 shadow-overlay">
          <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} disabled={mutation.isPending} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
          <h2 id={titleId} className="pr-10 font-display text-lg font-medium">Send a proposal</h2>
          <p id={descId} className="mt-1 mb-4 text-sm leading-6 text-muted">
            For &ldquo;{job.title}&rdquo;. The steps and amounts start from the seller&rsquo;s usual split; change anything before you send.
          </p>
          <ProposalEditor
            initial={initial}
            mode="new"
            pending={mutation.isPending}
            serverError={serverError}
            onSubmit={(body) => mutation.mutate({ jobId: job.id, ...body })}
          />
          {alreadyOpen ? (
            <p className="mt-3 text-sm">
              <Link href="/contracts?tab=client" className="font-medium text-primary hover:underline">Open your proposals</Link>
            </p>
          ) : null}
        </section>
      </div>
    </DialogPortal>
  )
}
