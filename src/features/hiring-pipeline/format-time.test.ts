import { describe, expect, it } from 'vitest'
import { bookedToastText, formatPipelineTime } from './format-time'

describe('formatPipelineTime', () => {
  it('writes the time like "Wed 25 Nov, 10:00" in the viewer local time', () => {
    // new Date(y, m, d, h, min) is local time, so the test gives the same answer in every time zone.
    expect(formatPipelineTime(new Date(2026, 10, 25, 10, 0).toISOString())).toBe('Wed 25 Nov, 10:00')
  })

  it('pads minutes and hours with a zero and does not pad the day', () => {
    expect(formatPipelineTime(new Date(2026, 11, 3, 9, 5).toISOString())).toBe('Thu 3 Dec, 09:05')
  })

  it('returns an empty text for a bad date', () => {
    expect(formatPipelineTime('nope')).toBe('')
  })
})

describe('bookedToastText', () => {
  it('names the picked time', () => {
    expect(bookedToastText(new Date(2026, 10, 25, 10, 0).toISOString())).toBe('Interview booked for Wed 25 Nov, 10:00.')
  })

  it('stays short when the time cannot be read', () => {
    expect(bookedToastText('nope')).toBe('Interview booked.')
  })
})
