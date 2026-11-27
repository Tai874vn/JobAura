'use client'

/**
 * Renders the action button bars inside a contract detail view: milestone actions (fund, submit, approve, request changes) and contract-wide actions (propose a change, end contract, message).
 *
 * Calls: visibleMilestoneActions; credits
 * Used by:
 *   - features/contracts/components/contract/contract-milestones.tsx
 *   - features/contracts/components/contract/contract-panel.tsx
 */

import { MessageSquare } from 'lucide-react'
import { credits } from '@/shared/lib/credits'
import type { ContractStatus, MilestoneView } from '@/shared/schemas'
import { Button } from '@/shared/ui'
import type { ContractAction, ContractDialog } from '../../utils/contract-actions'
import { visibleMilestoneActions, type ContractViewerRole, type MilestoneAction } from '../../utils/milestone-actions'

/**
 * Buttons for the current milestone (fund, submit, approve, request changes).
 * Uses the pure `visibleMilestoneActions` helper so role and status rules live in one place.
 */
export function MilestoneActionBar({
  role,
  contractStatus,
  milestone,
  pending,
  onOpenDialog,
}: {
  role: ContractViewerRole
  contractStatus: ContractStatus
  milestone: MilestoneView
  pending: boolean
  onOpenDialog: (dialog: ContractDialog) => void
}) {
  const actions = visibleMilestoneActions(role, contractStatus, milestone.status)
  if (!actions.length) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2 pr-24 lg:pr-0">
      {actions.map((action) => (
        <MilestoneActionButton key={action} action={action} milestone={milestone} pending={pending} onOpenDialog={onOpenDialog} />
      ))}
    </div>
  )
}

function MilestoneActionButton({
  action,
  milestone,
  pending,
  onOpenDialog,
}: {
  action: MilestoneAction
  milestone: MilestoneView
  pending: boolean
  onOpenDialog: (dialog: ContractDialog) => void
}) {
  switch (action) {
    case 'fund':
      return (
        <Button type="button" className="h-auto min-h-10 whitespace-normal py-2" disabled={pending} onClick={() => onOpenDialog({ type: 'fund', milestoneId: milestone.id })}>
          Fund milestone {milestone.position} ({credits(milestone.amount)})
        </Button>
      )
    case 'submit':
      return (
        <Button type="button" disabled={pending} onClick={() => onOpenDialog({ type: 'submit', milestoneId: milestone.id })}>
          Submit work
        </Button>
      )
    case 'approve':
      return (
        <Button type="button" className="h-auto min-h-10 whitespace-normal py-2" disabled={pending} onClick={() => onOpenDialog({ type: 'approve', milestoneId: milestone.id })}>
          Approve and release {credits(milestone.amount)}
        </Button>
      )
    case 'requestChanges':
      return (
        <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenDialog({ type: 'requestChanges', milestoneId: milestone.id })}>
          Request changes
        </Button>
      )
  }
}

/** Contract-wide buttons shown to the client and freelancer: propose a change, end, and message. */
export function ContractActionBar({
  actions,
  otherName,
  pending,
  onOpenDialog,
  onOpenChat,
}: {
  actions: ContractAction[]
  otherName: string
  pending: boolean
  onOpenDialog: (dialog: ContractDialog) => void
  onOpenChat: () => void
}) {
  const can = (action: ContractAction) => actions.includes(action)
  return (
    <div className="mt-4 flex flex-wrap gap-2 pr-24 lg:pr-0">
      {can('proposeAmendment') ? (
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => onOpenDialog({ type: 'proposeAmendment' })}>Propose a change</Button>
      ) : null}
      {can('endNow') ? <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => onOpenDialog({ type: 'endNow' })}>End contract</Button> : null}
      {can('requestEnd') ? <Button type="button" variant="danger" size="sm" disabled={pending} onClick={() => onOpenDialog({ type: 'requestEnd' })}>Ask to end</Button> : null}
      {can('message') ? (
        <Button type="button" variant="ghost" size="sm" onClick={onOpenChat}>
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Message {otherName.split(' ')[0]}
        </Button>
      ) : null}
    </div>
  )
}
