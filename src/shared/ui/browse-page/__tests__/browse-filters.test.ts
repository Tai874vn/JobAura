import { describe, expect, it } from 'vitest'
import { countOf, listOf, shownRange, toggleListValue } from '../browse-filters'

describe('browse filters', () => {
  it('reads a comma-separated URL value as a list, dropping blanks and spaces', () => {
    expect(listOf('Senior, Junior,,')).toEqual(['Senior', 'Junior'])
    expect(listOf('')).toEqual([])
  })

  it('adds a value that is not in the list and removes one that is', () => {
    expect(toggleListValue('Senior', 'Junior')).toBe('Senior,Junior')
    expect(toggleListValue('Senior,Junior', 'Senior')).toBe('Junior')
    expect(toggleListValue('', 'Senior')).toBe('Senior')
    expect(toggleListValue('Senior', 'Senior')).toBe('')
  })

  it('finds the count of a choice whatever its letter case, or nothing', () => {
    const counts = [{ value: 'Da Nang', count: 5 }]
    expect(countOf(counts, 'da nang')).toBe(5)
    expect(countOf(counts, 'Hue')).toBeUndefined()
    expect(countOf(undefined, 'Hue')).toBeUndefined()
  })

  it('gives the first and last item shown on a page', () => {
    expect(shownRange(1, 10, 30)).toEqual({ first: 1, last: 10 })
    expect(shownRange(3, 10, 25)).toEqual({ first: 21, last: 25 })
    expect(shownRange(1, 10, 0)).toEqual({ first: 0, last: 0 })
  })
})
