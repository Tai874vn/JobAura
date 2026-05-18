import { describe, expect, it } from 'vitest'
import { queryKeys } from './query-keys'

describe('query keys', () => {
  it('returns stable key prefixes and parameterized keys', () => {
    expect(queryKeys.me).toEqual(['auth', 'me'])
    expect(queryKeys.job(3)).toEqual(['jobs', 3])
    expect(queryKeys.chatMessages(7)).toEqual(['chat', 'messages', 7])
  })

  it('uses empty objects for missing params', () => {
    expect(queryKeys.jobs()).toEqual(['jobs', {}])
    expect(queryKeys.users()).toEqual(['users', {}])
  })
})
