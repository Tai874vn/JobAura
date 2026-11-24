import { describe, expect, it } from 'vitest'
import type { ProposalVersionView } from '@/shared/schemas'
import {
  editorErrors,
  editorTotal,
  fromVersion,
  prefillFromService,
  toVersionBody,
  type EditorCheckOptions,
  type EditorRow,
  type EditorState,
} from './proposal-editor-model'

const template = [
  { title: 'Plan', description: 'Outline', share: 30 },
  { title: 'Build', share: 40 },
  { title: 'Polish', share: 30 },
]
const amounts = (rows: EditorRow[]) => rows.map((r) => r.amount)

describe('prefillFromService', () => {
  it('splits 1,000 credits 30/40/30 into 300/400/300', () => {
    const rows = prefillFromService({ price: 1000, milestoneTemplate: template }, '2026-12-11', '2026-11-30')
    expect(amounts(rows)).toEqual(['300', '400', '300'])
    expect(rows.map((r) => r.title)).toEqual(['Plan', 'Build', 'Polish'])
    expect(rows[0].description).toBe('Outline')
  })

  it('puts the left-over credit on the last row so the sum equals the price', () => {
    const rows = prefillFromService({ price: 1001, milestoneTemplate: template }, '2026-12-11', '2026-11-30')
    expect(amounts(rows)).toEqual(['300', '400', '301'])
    expect(editorTotal(rows)).toBe(1001)
  })

  it('leaves amounts empty when the price is 0', () => {
    const rows = prefillFromService({ price: 0, milestoneTemplate: template }, '2026-12-11', '2026-11-30')
    expect(amounts(rows)).toEqual(['', '', ''])
  })

  it('makes one "Full work" row without a template', () => {
    const rows = prefillFromService({ price: 500, milestoneTemplate: null }, '2026-12-11', '2026-11-30')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ title: 'Full work', amount: '500', dueDate: '2026-12-11' })
  })

  it('spreads due dates evenly from tomorrow, the last one on the deadline', () => {
    // tomorrow = 2026-12-01, deadline = 2026-12-31: 30 days apart, steps of 10 days
    const rows = prefillFromService({ price: 900, milestoneTemplate: template }, '2026-12-31', '2026-11-30')
    expect(rows.map((r) => r.dueDate)).toEqual(['2026-12-11', '2026-12-21', '2026-12-31'])
  })

  it('never puts a date past the deadline when the deadline is very close', () => {
    const rows = prefillFromService({ price: 900, milestoneTemplate: template }, '2026-12-01', '2026-11-30')
    expect(rows.map((r) => r.dueDate)).toEqual(['2026-12-01', '2026-12-01', '2026-12-01'])
  })
})

const row = (key: string, dueDate: string, amount: string, title = 'Step'): EditorRow => ({
  key,
  title,
  description: '',
  dueDate,
  amount,
})
const good = (): EditorState => ({
  brief: 'Build my site',
  referenceLinks: [],
  referenceImages: [],
  deadline: '2026-12-31',
  rows: [row('a', '2026-12-10', '500'), row('b', '2026-12-20', '700')],
})
const TODAY = '2026-11-30'
const messages = (s: EditorState) => editorErrors(s, TODAY).map((e) => `${e.field}: ${e.message}`)

describe('editorErrors', () => {
  it('has no error for a good proposal', () => {
    expect(editorErrors(good(), TODAY)).toEqual([])
  })

  it('needs a brief', () => {
    expect(editorErrors({ ...good(), brief: '  ' }, TODAY)).toEqual([{ field: 'brief', message: 'Brief is required.' }])
  })

  it('refuses 0 or empty amounts, on the row', () => {
    const s = good()
    s.rows[1].amount = '0'
    s.rows[0].amount = ''
    expect(messages(s)).toEqual([
      'rows.a.amount: Each milestone is at least 1 credit.',
      'rows.b.amount: Each milestone is at least 1 credit.',
    ])
  })

  it('refuses an amount above 1,000,000', () => {
    const s = good()
    s.rows[0].amount = '1000001'
    expect(messages(s)).toEqual(['rows.a.amount: A milestone can be up to 1,000,000 credits.'])
  })

  it('refuses a first due date of today or before', () => {
    const s = good()
    s.rows[0].dueDate = TODAY
    expect(messages(s)).toEqual(['rows.a.dueDate: The first due date must be in the future.'])
  })

  it('refuses due dates out of order, on the later row', () => {
    const s = good()
    s.rows[1].dueDate = '2026-12-05'
    expect(messages(s)).toEqual(['rows.b.dueDate: Milestone due dates must be in order.'])
  })

  it('refuses a due date after the deadline', () => {
    const s = good()
    s.rows[1].dueDate = '2027-01-05'
    expect(messages(s)).toEqual(['rows.b.dueDate: A due date cannot be after the deadline.'])
  })

  it('needs 1 to 20 milestones', () => {
    expect(messages({ ...good(), rows: [] })).toEqual(['milestones: A proposal has 1 to 20 milestones.'])
    const many = Array.from({ length: 21 }, (_, i) => row(`r${i}`, '2026-12-10', '5'))
    expect(messages({ ...good(), rows: many })).toEqual(['milestones: A proposal has 1 to 20 milestones.'])
  })

  it('accepts only web links', () => {
    expect(messages({ ...good(), referenceLinks: ['https://a.dev', 'ftp://x'] })).toEqual([
      'referenceLinks: referenceLinks must be web links.',
    ])
    expect(editorErrors({ ...good(), referenceLinks: ['http://a.dev', ''] }, TODAY)).toEqual([])
  })

  it('skips rows that cannot change (amendment mode)', () => {
    const s = good()
    s.rows[0] = row('a', '2026-11-01', '5')
    expect(editorErrors(s, TODAY, { closedKeys: new Set(['a']) })).toEqual([])
  })
})

describe('editorErrors in amendment mode (the server change-request rules)', () => {
  const rows = (): EditorRow[] => [
    row('m1', '2026-11-20', '500'), // APPROVED, closed
    row('m2', '2026-11-29', '300'), // FUNDED and overdue
    row('m3', '2026-12-20', '700'), // PENDING
  ]
  const base = (r: EditorRow[]): EditorState => ({ ...good(), rows: r })
  const opts = {
    closedKeys: new Set(['m1']),
    originalDates: { m1: '2026-11-20', m2: '2026-11-29', m3: '2026-12-20' },
  }
  const text = (s: EditorState, o: EditorCheckOptions = opts) => editorErrors(s, TODAY, o).map((e) => `${e.field}: ${e.message}`)

  it('allows lowering a PENDING amount while the FUNDED milestone is overdue', () => {
    const r = rows()
    r[2].amount = '600'
    expect(text(base(r))).toEqual([])
  })

  it('allows adding a milestone while the FUNDED one is overdue', () => {
    expect(text(base([...rows(), row('n1', '2026-12-25', '50')]))).toEqual([])
  })

  it('refuses a moved date that is not in the future, and a new row dated today', () => {
    const r = rows()
    r[2].dueDate = TODAY
    expect(text(base(r))).toEqual(['rows.m3.dueDate: A new due date must be in the future.'])
    expect(text(base([...rows(), row('n1', TODAY, '5')]))).toEqual(['rows.n1.dueDate: A new due date must be in the future.'])
  })

  it('refuses a change that breaks the order against a SUBMITTED or APPROVED row', () => {
    const r = [row('s1', '2026-12-15', '100'), row('s2', '2026-12-18', '100')]
    r[1].dueDate = '2026-12-10'
    const o = { closedKeys: new Set(['s1']), originalDates: { s1: '2026-12-15', s2: '2026-12-18' } }
    expect(text(base(r), o)).toEqual(['rows.s2.dueDate: Milestone due dates must be in order.'])
  })

  it('leaves cancelled rows out of the date order', () => {
    const r = [row('c1', '2026-12-30', '5'), row('p1', '2026-12-10', '5')]
    const o = { cancelledKeys: new Set(['c1']), closedKeys: new Set(['c1']), originalDates: { c1: '2026-12-30', p1: '2026-12-10' } }
    expect(text(base(r), o)).toEqual([])
  })
})

describe('editorTotal', () => {
  it('ignores empty and unreadable rows', () => {
    expect(editorTotal([row('a', '', '1,250'), row('b', '', ''), row('c', '', 'abc'), row('d', '', '2.5'), row('e', '', '50')])).toBe(1300)
  })
})

describe('toVersionBody', () => {
  it('sends every date as 23:59 local time, as ISO', () => {
    const body = toVersionBody(good())
    expect(body.deadline).toBe(new Date(2026, 11, 31, 23, 59, 0, 0).toISOString())
    expect(body.milestones[0].dueDate).toBe(new Date(2026, 11, 10, 23, 59, 0, 0).toISOString())
    expect(body.milestones.map((m) => m.amount)).toEqual([500, 700])
  })

  it('turns 2026-12-01 into 23:59 local that day', () => {
    const s = { ...good(), deadline: '2026-12-01' }
    const back = new Date(toVersionBody(s).deadline)
    expect([back.getFullYear(), back.getMonth(), back.getDate(), back.getHours(), back.getMinutes()]).toEqual([2026, 11, 1, 23, 59])
  })

  it('drops blank links and empty descriptions', () => {
    const s = { ...good(), referenceLinks: [' https://a.dev ', ' '] }
    const body = toVersionBody(s)
    expect(body.referenceLinks).toEqual(['https://a.dev'])
    expect('description' in body.milestones[0]).toBe(false)
  })
})

describe('fromVersion', () => {
  it('reads an earlier version back into the editor', () => {
    const v = {
      id: 1,
      number: 1,
      authorId: 2,
      total: 500,
      createdAt: '2026-11-25T00:00:00.000Z',
      brief: 'Hi',
      referenceLinks: ['https://a.dev'],
      referenceImages: [],
      deadline: new Date(2026, 11, 31, 23, 59).toISOString(),
      milestones: [{ title: 'A', description: null, dueDate: new Date(2026, 11, 10, 23, 59).toISOString(), amount: 500 }],
    } as ProposalVersionView
    const s = fromVersion(v)
    expect(s.deadline).toBe('2026-12-31')
    expect(s.rows[0]).toMatchObject({ title: 'A', description: '', dueDate: '2026-12-10', amount: '500' })
  })
})
