import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorCode } from '@/shared/lib/utils'
import { readHashToken } from '../email-flows'

describe('readHashToken', () => {
  it('reads the token after #token=', () => {
    expect(readHashToken('#token=abc_DEF-123')).toBe('abc_DEF-123')
    expect(readHashToken('token=xyz')).toBe('xyz')
  })

  it('answers null for a missing, empty or oversized token', () => {
    expect(readHashToken('')).toBeNull()
    expect(readHashToken('#other=1')).toBeNull()
    expect(readHashToken('#token=')).toBeNull()
    expect(readHashToken(`#token=${'a'.repeat(201)}`)).toBeNull()
  })
})

describe('getErrorCode', () => {
  const axiosError = (data: unknown) => {
    const headers = new AxiosHeaders()
    return new AxiosError('x', 'ERR_BAD_REQUEST', { headers }, null, {
      status: 403,
      statusText: 'Forbidden',
      headers,
      config: { headers },
      data,
    })
  }

  it('returns the backend code for branching the UI', () => {
    expect(getErrorCode(axiosError({ code: 'EMAIL_NOT_VERIFIED', message: 'm' }))).toBe('EMAIL_NOT_VERIFIED')
  })

  it('returns undefined when there is no string code', () => {
    expect(getErrorCode(axiosError({ message: 'm' }))).toBeUndefined()
    expect(getErrorCode(axiosError({ code: 5 }))).toBeUndefined()
    expect(getErrorCode(new Error('plain'))).toBeUndefined()
  })
})
