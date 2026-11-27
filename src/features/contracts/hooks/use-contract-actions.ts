'use client'

/**
 * Hook that owns all contract mutations, review submission, wallet balance checks, and open dialog state for ContractPanel.
 * Closes stale dialogs when the contract state changes and refreshes related caches after a review succeeds.
 *
 * Calls: POST /api/comments; GET /api/wallet; useContractMutation; contractsApi; runDialogAction; dialogStillAllowed; lowerAmountFrom; refreshServicePageAfterReview
 * Used by:
 *   - features/contracts/components/contract/contract-panel.tsx
 *   - features/contracts/components/dialogs/contract-dialogs.tsx
 */

import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { runDialogAction } from '@/features/hiring-pipeline/utils/run-dialog-action'
import { walletApi, walletKeys } from '@/features/wallet/api'
import { reportNonFatalError } from '@/shared/api/query-client'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ContractDetail, EndChoice, MilestoneView } from '@/shared/schemas'
import { contractKeys, contractsApi } from '../api'
import { lowerAmountFrom, type AmendmentBody } from '../utils/amendment-changes'
import { dialogStillAllowed, type ContractDialog } from '../utils/contract-actions'
import { refreshServicePageAfterReview } from '../utils/refresh-service-page'
import type { WorkBody } from '../components/dialogs/submit-work-dialog'
import { useContractMutation } from './use-contract-mutation'

/** One thing the viewer can ask the server to do on this contract. */
export type ContractAct =
  | { type: 'fund' | 'approve'; milestoneId: number }
  | { type: 'submit'; milestoneId: number; body: WorkBody }
  | { type: 'requestChanges'; milestoneId: number; note: string }
  | { type: 'proposeAmendment'; body: AmendmentBody & { note?: string } }
  | { type: 'acceptAmendment' | 'withdrawAmendment'; amendmentId: number }
  | { type: 'declineAmendment'; amendmentId: number; note?: string }
  | { type: 'requestEnd'; note?: string; choice?: EndChoice }
  | { type: 'acceptEnd'; choice?: EndChoice }
  | { type: 'declineEnd' | 'withdrawEnd' | 'endNow' }

const doneText: Record<ContractAct['type'], string> = {
  fund: 'Milestone funded. The freelancer can start.',
  submit: 'Work submitted. The client is told.',
  requestChanges: 'Changes requested.',
  approve: 'Milestone approved. The credits are released.',
  proposeAmendment: 'Change request sent.',
  acceptAmendment: 'Change request accepted.',
  declineAmendment: 'Change request declined.',
  withdrawAmendment: 'Change request withdrawn.',
  requestEnd: 'End request sent.',
  acceptEnd: 'Contract ended.',
  declineEnd: 'End request declined.',
  withdrawEnd: 'End request withdrawn.',
  endNow: 'Contract ended.',
}

function runContractAct(contractId: number, act: ContractAct): Promise<ContractDetail> {
  switch (act.type) {
    case 'fund':
      return contractsApi.fund(act.milestoneId)
    case 'submit':
      return contractsApi.submit(act.milestoneId, act.body)
    case 'requestChanges':
      return contractsApi.requestChanges(act.milestoneId, act.note)
    case 'approve':
      return contractsApi.approve(act.milestoneId)
    case 'proposeAmendment':
      return contractsApi.proposeAmendment(contractId, act.body)
    case 'acceptAmendment':
      return contractsApi.acceptAmendment(act.amendmentId)
    case 'declineAmendment':
      return contractsApi.declineAmendment(act.amendmentId, act.note)
    case 'withdrawAmendment':
      return contractsApi.withdrawAmendment(act.amendmentId)
    case 'requestEnd':
      return contractsApi.requestEnd(contractId, { note: act.note, submittedChoice: act.choice })
    case 'acceptEnd':
      return contractsApi.acceptEnd(contractId, act.choice)
    case 'declineEnd':
      return contractsApi.declineEnd(contractId)
    case 'withdrawEnd':
      return contractsApi.withdrawEnd(contractId)
    case 'endNow':
      return contractsApi.endNow(contractId)
  }
}

/**
 * Updates client caches and triggers server revalidation right after a contract review succeeds.
 */
export function handleReviewSuccess({
  queryClient,
  detailKey,
  contractId,
  input,
}: {
  queryClient: QueryClient
  detailKey: QueryKey
  contractId: number
  input: { rating: number; content: string }
}) {
  // The answer is the comment, not the contract: show the review at once, then read the contract again.
  queryClient.setQueryData<ContractDetail>(detailKey, (old) => (old ? { ...old, canReview: false, review: { id: 0, ...input } } : old))
  void queryClient.invalidateQueries({ queryKey: ['contracts'] })
  void queryClient.invalidateQueries({ queryKey: queryKeys.comments })
  void queryClient.invalidateQueries({ queryKey: ['jobs'] })
  // The service, marketplace, and freelancer profile pages keep a server cache; clear them so the review shows at once.
  // A failure here only means the old list shows a little longer, so report it in the background.
  void refreshServicePageAfterReview(contractId).catch((error) => reportNonFatalError(error, 'cache:revalidate-service'))
}

/**
 * Owns all contract mutations, the review mutation, the wallet balance check, and the open dialog state.
 * Keeping dialog state alongside the mutations ensures a dialog closes in the same render batch as
 * `setQueryData`, so our own successful step never triggers the stale-dialog notice.
 */
export function useContractActions(contract: ContractDetail, viewerId: number, canFund: boolean) {
  const queryClient = useQueryClient()
  const detailKey = contractKeys.contract(contract.id, viewerId)
  const [dialog, setDialog] = useState<ContractDialog | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  // A sentence kept on the panel when a dialog had to close because the contract moved on.
  const [notice, setNotice] = useState<string | null>(null)

  function closeDialog() {
    setDialog(null)
    setDialogError(null)
  }

  const mutation = useContractMutation(detailKey, (act: ContractAct) => runContractAct(contract.id, act), {
    // Every step runs from a dialog, which shows the refusal itself.
    quietErrors: () => true,
    // Close the dialog in the same render batch as setQueryData so our own success never triggers the stale-dialog notice.
    onSuccess: closeDialog,
  })

  // Data: contractsApi.review → POST /api/comments → NestjsBE/src/modules/comments/services/comments.service.ts create()
  const review = useMutation({
    mutationFn: (input: { rating: number; content: string }) => contractsApi.review({ contractId: contract.id, ...input }),
    onSuccess: (_answer, input) => {
      closeDialog()
      handleReviewSuccess({ queryClient, detailKey, contractId: contract.id, input })
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: detailKey }),
  })

  const pending = mutation.isPending || review.isPending

  // The balance, for "after funding" in the fund dialog. Read only when the client can fund.
  // Data: walletApi.summary → GET /api/wallet → NestjsBE/src/modules/wallet/services/wallet.service.ts summary()
  const wallet = useQuery({
    queryKey: walletKeys.summary(viewerId),
    queryFn: walletApi.summary,
    enabled: canFund,
    staleTime: 15_000,
  })

  // The contract changed under an open dialog (the other side or the deadline job acted): close it and say so.
  // Not while a step is running: our own success closes the dialog in onSuccess right beside setQueryData.
  if (dialog !== null && !pending && !dialogStillAllowed(dialog, contract, viewerId)) {
    setNotice(dialogError ?? 'This contract changed, so that step is no longer possible.')
    setDialog(null)
    setDialogError(null)
  }

  function openDialog(next: ContractDialog) {
    setNotice(null)
    setDialogError(null)
    setDialog(next)
  }

  async function runAction(act: ContractAct) {
    setDialogError(null)
    const result = await runDialogAction(
      () => mutation.mutateAsync(act),
      (error) => getErrorMessage(error, 'Could not save this change. Please try again.'),
    )
    if ('error' in result) {
      setDialogError(result.error)
      return
    }
    toast.success(doneText[act.type])
    closeDialog()
  }

  async function sendReview(input: { rating: number; content: string }) {
    setDialogError(null)
    const result = await runDialogAction(
      () => review.mutateAsync(input),
      (error) => getErrorMessage(error, 'Could not send the review. Please try again.'),
    )
    if ('error' in result) {
      setDialogError(result.error)
      return
    }
    toast.success('Review sent. Thank you.')
    closeDialog()
  }

  /** From the fund dialog: open the change-request editor with that milestone's amount lowered to what the client has. */
  function askToLower(milestone: MilestoneView) {
    const have = lowerAmountFrom(dialogError) ?? wallet.data?.available ?? null
    const amount = have !== null && have >= 1 && have < milestone.amount ? have : null
    openDialog({ type: 'proposeAmendment', preset: amount !== null ? { milestoneId: milestone.id, amount } : undefined })
  }

  return {
    dialog,
    dialogError,
    notice,
    pending,
    availableCredits: wallet.data?.available,
    openDialog,
    closeDialog,
    runAction,
    sendReview,
    askToLower,
  }
}
