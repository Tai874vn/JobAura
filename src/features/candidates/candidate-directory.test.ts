import { describe, expect, it } from 'vitest'
import { filterCandidates, demoCandidates } from './candidate-directory'

describe('candidate directory data', () => {
  it('filters candidates by keyword, skill, location, and level', () => {
    const result = filterCandidates(demoCandidates, {
      keyword: 'api',
      skill: 'FastAPI',
      location: 'Remote',
      level: 'senior',
      availableOnly: true,
    })

    expect(result.map((candidate) => candidate.name)).toEqual(['Lina Tran'])
  })

  it('returns all candidates when filters are empty', () => {
    expect(filterCandidates(demoCandidates, {}).length).toBe(demoCandidates.length)
  })
})
