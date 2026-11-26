import { describe, expect, it } from 'vitest'
import { blankTemplateRow, fromTemplate, serviceAreaError, templateErrors, templateShareTotal, toTemplatePayload, type TemplateRow } from './milestone-template'

const row = (title: string, share: string, description = ''): TemplateRow => ({ key: title || 'x', title, description, share })

describe('templateErrors', () => {
  it('accepts shares that add to 100 and an empty template', () => {
    expect(templateErrors([row('Sketch', '30'), row('Build', '50'), row('Polish', '20')])).toEqual([])
    expect(templateErrors([])).toEqual([])
  })

  it('refuses shares that do not add to 100, and says how many are used', () => {
    const errors = templateErrors([row('Sketch', '30'), row('Build', '40'), row('Polish', '20')])
    expect(errors).toEqual([{ field: 'total', message: 'Shares add up to 90 of 100%.' }])
    expect(templateShareTotal([row('a', '30'), row('b', '40'), row('c', '20')])).toBe(90)
  })

  it('refuses more than 10 rows', () => {
    const rows = Array.from({ length: 11 }, (_, i) => row(`Step ${i}`, i === 0 ? '10' : '9'))
    expect(templateErrors(rows).map((e) => e.field)).toContain('rows')
  })

  it('refuses an empty title, a long title and a share that is not a whole 1-100', () => {
    const errors = templateErrors([
      { ...row('', '50'), key: 'a' },
      { ...row('x'.repeat(81), '0'), key: 'b' },
      { ...row('ok', '2.5'), key: 'c' },
    ])
    expect(errors).toContainEqual({ field: 'rows.a.title', message: 'Give this step a title.' })
    expect(errors).toContainEqual({ field: 'rows.b.title', message: 'A title is at most 80 characters.' })
    expect(errors).toContainEqual({ field: 'rows.b.share', message: 'Use a whole percent from 1 to 100.' })
    expect(errors).toContainEqual({ field: 'rows.c.share', message: 'Use a whole percent from 1 to 100.' })
  })

  it('refuses a description over 300 characters', () => {
    const errors = templateErrors([row('A', '100', 'x'.repeat(301))])
    expect(errors).toContainEqual({ field: 'rows.A.description', message: 'A description is at most 300 characters.' })
  })
})

describe('template payload', () => {
  it('sends null for an empty template and trimmed rows otherwise', () => {
    expect(toTemplatePayload([])).toBeNull()
    expect(toTemplatePayload([row(' Sketch ', '30', ' idea '), row('Build', '70')])).toEqual([
      { title: 'Sketch', description: 'idea', share: 30 },
      { title: 'Build', share: 70 },
    ])
  })

  it('reads a saved template back into rows', () => {
    const rows = fromTemplate([{ title: 'A', description: null, share: 40 }, { title: 'B', description: 'x', share: 60 }])
    expect(rows.map((r) => [r.title, r.description, r.share])).toEqual([['A', '', '40'], ['B', 'x', '60']])
    expect(fromTemplate(null)).toEqual([])
    expect(blankTemplateRow('k').share).toBe('')
  })
})

describe('serviceAreaError', () => {
  it('asks for an area when the work is onsite, and caps the length', () => {
    expect(serviceAreaError('REMOTE', '')).toBeUndefined()
    expect(serviceAreaError('ONSITE', '  ')).toBe('Say where the work happens.')
    expect(serviceAreaError('BOTH', 'Hanoi')).toBeUndefined()
    expect(serviceAreaError('BOTH', 'x'.repeat(161))).toBe('The area is at most 160 characters.')
  })
})
