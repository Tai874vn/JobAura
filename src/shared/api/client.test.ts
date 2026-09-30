import { describe, expect, it } from 'vitest'
import { apiClient, uploadClient } from './client'

describe('API client timeouts', () => {
  it('bounds regular and upload requests', () => {
    expect(apiClient.defaults.timeout).toBe(15_000)
    expect(uploadClient.defaults.timeout).toBe(15_000)
  })
})
