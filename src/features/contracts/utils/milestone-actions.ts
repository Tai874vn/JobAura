/**
 * Viewer role and milestone button rules for the contracts feature.
 * Checks whether the viewer is the client, freelancer, or an observer, and returns the milestone actions allowed for the current state.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/contracts/components/contract/contract-action-bar.tsx
 *   - features/contracts/components/contract/contract-milestones.tsx
 *   - features/contracts/components/contract/contract-panel.tsx
 *   - features/contracts/utils/contract-actions.ts
 */

import type { ContractDetail, ContractStatus, MilestoneStatus } from '@/shared/schemas'

/** Who is looking at the contract: one of the two sides, or someone else (such as an admin). */
export type ContractViewerRole = 'client' | 'freelancer' | 'observer'

/** Actions that appear on the current milestone card. */
export type MilestoneAction = 'fund' | 'submit' | 'approve' | 'requestChanges'

/** Finds which side of the contract this viewer is on. Anyone else is a read-only observer. */
export function viewerRoleFor(
  contract: Pick<ContractDetail, 'client' | 'freelancer'>,
  viewerId: number,
): ContractViewerRole {
  if (viewerId === contract.client.id) return 'client'
  if (viewerId === contract.freelancer.id) return 'freelancer'
  return 'observer'
}

/**
 * Decides which milestone buttons to show for a viewer role, contract status, and milestone status.
 * Returned in the order the buttons appear on the milestone action bar.
 */
export function visibleMilestoneActions(
  role: ContractViewerRole,
  contractStatus: ContractStatus,
  milestoneStatus: MilestoneStatus | null,
): MilestoneAction[] {
  if (contractStatus !== 'ACTIVE' || role === 'observer' || milestoneStatus === null) return []

  if (role === 'client') {
    if (milestoneStatus === 'PENDING') return ['fund']
    if (milestoneStatus === 'SUBMITTED') return ['approve', 'requestChanges']
    return []
  }

  if (milestoneStatus === 'FUNDED' || milestoneStatus === 'CHANGES_REQUESTED') return ['submit']
  return []
}
