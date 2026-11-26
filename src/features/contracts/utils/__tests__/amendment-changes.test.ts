import { describe, expect, it } from 'vitest'
import { amendmentStart, buildAmendment, describeAmendment, lowerAmountFrom } from '../amendment-changes'
import { contractOf, milestoneOf } from '../contract-test-data'

// 23:59 local time of a day, as the editor sends it.
const local = (y: number, m: number, d: number) => new Date(y, m - 1, d, 23, 59, 0, 0).toISOString()

const contract = () =>
  contractOf(
    [
      milestoneOf(1, 'APPROVED', { dueDate: local(2030, 1, 5), amount: 300 }),
      milestoneOf(2, 'FUNDED', { dueDate: local(2030, 1, 10), amount: 500 }),
      milestoneOf(3, 'PENDING', { dueDate: local(2030, 1, 20), amount: 200 }),
    ],
    { deadline: local(2030, 2, 1) },
  )

describe('amendmentStart', () => {
  it('lists every milestone as a locked row with its status, and the contract deadline', () => {
    const { initial, lockedRows } = amendmentStart(contract())
    expect(initial.deadline).toBe('2030-02-01')
    expect(initial.rows.map((r) => [r.key, r.dueDate, r.amount])).toEqual([
      ['m41', '2030-01-05', '300'],
      ['m42', '2030-01-10', '500'],
      ['m43', '2030-01-20', '200'],
    ])
    expect(lockedRows).toEqual({ m41: 'APPROVED', m42: 'FUNDED', m43: 'PENDING' })
  })
  it('can start with a lower amount on one milestone (from "Ask to lower the amount")', () => {
    const { initial } = amendmentStart(contract(), { milestoneId: 43, amount: 150 })
    expect(initial.rows[2].amount).toBe('150')
  })
})

describe('buildAmendment', () => {
  it('is empty when nothing changed', () => {
    const c = contract()
    expect(buildAmendment(c, amendmentStart(c).initial)).toEqual({ changes: [] })
  })

  it('sends a move, an amount change, an added milestone and a new deadline', () => {
    const c = contract()
    const state = amendmentStart(c).initial
    state.deadline = '2030-02-10'
    state.rows[1] = { ...state.rows[1], dueDate: '2030-01-12' }
    state.rows[2] = { ...state.rows[2], amount: '250' }
    state.rows.push({ key: 'n1', title: '  Final files ', description: '', dueDate: '2030-02-05', amount: '300' })
    expect(buildAmendment(c, state)).toEqual({
      deadline: local(2030, 2, 10),
      changes: [
        { op: 'move', milestoneId: 42, dueDate: local(2030, 1, 12) },
        { op: 'amount', milestoneId: 43, amount: 250 },
        { op: 'add', title: 'Final files', dueDate: local(2030, 2, 5), amount: 300 },
      ],
    })
  })

  it('keeps the description of an added milestone when one is typed', () => {
    const c = contract()
    const state = amendmentStart(c).initial
    state.rows.push({ key: 'n1', title: 'Extra', description: 'Two more sizes', dueDate: '2030-01-25', amount: '100' })
    expect(buildAmendment(c, state).changes).toEqual([
      { op: 'add', title: 'Extra', description: 'Two more sizes', dueDate: local(2030, 1, 25), amount: 100 },
    ])
  })

  it('never sends an amount change for a funded milestone', () => {
    const c = contract()
    const state = amendmentStart(c).initial
    state.rows[1] = { ...state.rows[1], amount: '999' }
    expect(buildAmendment(c, state)).toEqual({ changes: [] })
  })
})

describe('describeAmendment', () => {
  it('says what each change does, in words', () => {
    const c = contract()
    const lines = describeAmendment(
      {
        deadline: local(2030, 2, 10),
        changes: [
          { op: 'move', milestoneId: 42, dueDate: local(2030, 1, 12) },
          { op: 'amount', milestoneId: 43, amount: 250 },
          { op: 'add', title: 'Final files', dueDate: local(2030, 2, 5), amount: 300 },
          { op: 'add', title: 'Print', dueDate: local(2030, 2, 6), amount: 1 },
        ],
      },
      c,
    )
    expect(lines).toEqual([
      'Deadline: Fri 1 Feb → Sun 10 Feb',
      'Milestone 2 due date: Thu 10 Jan → Sat 12 Jan',
      'Milestone 3 amount: 200 credits → 250 credits',
      'Add milestone 4: Final files · 300 credits',
      'Add milestone 5: Print · 1 credit',
    ])
  })
})

describe('lowerAmountFrom', () => {
  it('reads the balance from the server sentence', () => {
    expect(lowerAmountFrom('You have 1,000 credits; this milestone needs 1,250. Top up or ask to lower the amount.')).toBe(1000)
    expect(lowerAmountFrom('You have 0 credits; this milestone needs 5. Top up or ask to lower the amount.')).toBeNull()
    expect(lowerAmountFrom('Milestone 1 is already funded.')).toBeNull()
  })
})
