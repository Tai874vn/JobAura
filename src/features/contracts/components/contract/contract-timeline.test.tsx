import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ContractEventView } from '@/shared/schemas'
import { ContractTimeline, describeContractEvent } from './contract-timeline'

const ann = { id: 1, name: 'Ann', avatar: null }
const event = (id: number, type: string, data: unknown = {}, actor: ContractEventView['actor'] = ann) =>
  ({ id, type, data, actor, proposalId: null, contractId: null, createdAt: '2026-11-21T01:00:00.000Z' }) as ContractEventView

describe('ContractTimeline', () => {
  it('renders the events in the order they are given', () => {
    const html = renderToStaticMarkup(
      <ContractTimeline events={[event(1, 'proposal_sent', { version: 1, total: 1250 }), event(2, 'proposal_accepted'), event(3, 'contract_started', { total: 1250 })]} />,
    )
    expect(html.indexOf('Ann sent a proposal')).toBeGreaterThan(-1)
    expect(html.indexOf('Ann sent a proposal')).toBeLessThan(html.indexOf('Ann accepted the proposal'))
    expect(html.indexOf('Ann accepted the proposal')).toBeLessThan(html.indexOf('The contract started'))
    expect(html).toContain('Total 1,250 credits')
  })

  it('says so when there is no history', () => {
    expect(renderToStaticMarkup(<ContractTimeline events={[]} />)).toContain('No history yet')
  })

  it('shows a new backend type as readable text instead of failing', () => {
    expect(renderToStaticMarkup(<ContractTimeline events={[event(1, 'some_new_type')]} />)).toContain('Some new type')
  })
})

describe('describeContractEvent', () => {
  const title = (type: string, data?: unknown, actor?: ContractEventView['actor']) => describeContractEvent(event(1, type, data, actor)).title

  it('has a plain sentence for every event type of the backend list', () => {
    expect(title('proposal_sent', { total: 5 })).toBe('Ann sent a proposal')
    expect(title('proposal_countered', { version: 2, total: 5 })).toBe('Ann sent a counter-offer')
    expect(title('proposal_accepted', { version: 2 })).toBe('Ann accepted the proposal')
    expect(title('proposal_declined')).toBe('Ann declined the proposal')
    expect(title('proposal_withdrawn')).toBe('Ann withdrew the proposal')
    expect(title('proposal_expired', undefined, null)).toBe('The proposal expired after 7 days without an answer')
    expect(title('contract_started', { total: 5 }, null)).toBe('The contract started')
    expect(title('milestone_funded', { position: 2, amount: 300 })).toBe('Ann funded milestone 2')
    expect(title('work_submitted', { position: 2, submission: 3 })).toBe('Ann submitted work for milestone 2')
    expect(title('changes_requested', { position: 2, note: 'More blue' })).toBe('Ann asked for changes on milestone 2')
    expect(title('milestone_approved', { position: 2, amount: 300, auto: false })).toBe('Ann approved milestone 2')
    expect(title('milestone_refunded', { position: 2, amount: 300 })).toBe('Credits for milestone 2 went back to the client')
    expect(title('milestone_cancelled', { position: 3 }, null)).toBe('Milestone 3 was cancelled')
    expect(title('warning_sent', { rule: 'NOT_FUNDED', position: 2 }, null)).toBe('JobAura sent a warning about milestone 2')
    expect(title('amendment_proposed', { amendmentId: 1 })).toBe('Ann asked for a change to the contract')
    expect(title('amendment_accepted', { amendmentId: 1 })).toBe('Ann accepted the change request')
    expect(title('amendment_declined', { amendmentId: 1 })).toBe('Ann declined the change request')
    expect(title('amendment_withdrawn', { amendmentId: 1 })).toBe('Ann withdrew the change request')
    expect(title('end_requested')).toBe('Ann asked to end the contract')
    expect(title('end_request_declined')).toBe('Ann declined the end request')
    expect(title('end_request_withdrawn')).toBe('Ann withdrew the end request')
    expect(title('contract_completed', undefined, null)).toBe('The contract is completed')
    expect(title('contract_ended', { reason: 'MUTUAL' }, null)).toBe('The contract ended')
    expect(title('review_left', { rating: 5 })).toBe('Ann left a review')
    expect(title('imported', { hireId: 4 }, null)).toBe('Copied from an earlier hire')
  })

  it('says the system did it when a sweeper approves', () => {
    const d = describeContractEvent(event(1, 'milestone_approved', { position: 1, amount: 1, auto: true }, null))
    expect(d.title).toBe('JobAura approved milestone 1 because no answer came in time')
    expect(d.detail).toBe('1 credit paid')
  })

  it('gives the reason, the note and the choice as detail', () => {
    expect(describeContractEvent(event(1, 'contract_ended', { reason: 'FREELANCER_LATE' }, null)).detail).toBe('Because the work was late')
    expect(describeContractEvent(event(1, 'changes_requested', { position: 1, note: 'More blue' })).detail).toBe('More blue')
    expect(describeContractEvent(event(1, 'end_requested', { note: 'Plans changed', choice: 'REFUND' })).detail).toBe('Plans changed · Take the credits back')
  })

  it('reads missing or empty data without failing', () => {
    expect(describeContractEvent(event(1, 'proposal_declined', null)).detail).toBeUndefined()
    expect(describeContractEvent(event(1, 'end_requested', {})).detail).toBeUndefined()
  })
})
