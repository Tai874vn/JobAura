import { describe, expect, it } from 'vitest'
import { getQueryClient } from './query-client'

describe('query client lifecycle', () => {
  it('creates isolated clients during server execution', () => {
    const first = getQueryClient()
    const second = getQueryClient()

    first.setQueryData(['private'], 'first request')

    expect(second).not.toBe(first)
    expect(second.getQueryData(['private'])).toBeUndefined()
  })
})
