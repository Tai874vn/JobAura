import { describe, expect, it } from 'vitest'
import type { ContractStatus, MilestoneStatus } from '@/shared/schemas'
import { CLIENT, FREELANCER, contractOf, milestoneOf } from '../contract-test-data'
import {
  viewerRoleFor,
  visibleMilestoneActions,
  type ContractViewerRole,
  type MilestoneAction,
} from '../milestone-actions'

const ROLES: ContractViewerRole[] = ['client', 'freelancer', 'observer']
const CONTRACT_STATUSES: ContractStatus[] = ['ACTIVE', 'COMPLETED', 'ENDED']
const MILESTONE_STATUSES: (MilestoneStatus | null)[] = [
  'PENDING',
  'FUNDED',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'CANCELLED',
  null,
]

function expectedFor(
  role: ContractViewerRole,
  contractStatus: ContractStatus,
  milestoneStatus: MilestoneStatus | null,
): MilestoneAction[] {
  if (contractStatus !== 'ACTIVE' || role === 'observer' || milestoneStatus === null) return []
  if (role === 'client' && milestoneStatus === 'PENDING') return ['fund']
  if (role === 'client' && milestoneStatus === 'SUBMITTED') return ['approve', 'requestChanges']
  if (role === 'freelancer' && (milestoneStatus === 'FUNDED' || milestoneStatus === 'CHANGES_REQUESTED')) {
    return ['submit']
  }
  return []
}

describe('viewerRoleFor', () => {
  it('identifies the client, the freelancer, and any other viewer as an observer', () => {
    const contract = contractOf([milestoneOf(1, 'PENDING')])
    expect(viewerRoleFor(contract, CLIENT)).toBe('client')
    expect(viewerRoleFor(contract, FREELANCER)).toBe('freelancer')
    expect(viewerRoleFor(contract, 99)).toBe('observer')
  })
})

describe('visibleMilestoneActions', () => {
  const cases: [ContractViewerRole, ContractStatus, MilestoneStatus | null, MilestoneAction[]][] = []
  for (const role of ROLES) {
    for (const contractStatus of CONTRACT_STATUSES) {
      for (const milestoneStatus of MILESTONE_STATUSES) {
        cases.push([role, contractStatus, milestoneStatus, expectedFor(role, contractStatus, milestoneStatus)])
      }
    }
  }

  it.each(cases)('role=%s contract=%s milestone=%s -> %j', (role, contractStatus, milestoneStatus, expected) => {
    expect(visibleMilestoneActions(role, contractStatus, milestoneStatus)).toEqual(expected)
  })
})
