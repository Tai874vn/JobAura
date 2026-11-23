import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { callExitHref, isAlreadyCompleted } from './call-exit'

describe('callExitHref', () => {
  it('sends a candidate to My applications with the application open', () => {
    expect(callExitHref({ role: 'candidate', postId: 3, applicationId: 9 })).toBe('/my-applications?application=9')
    expect(callExitHref({ role: 'candidate', postId: 3, applicationId: 9, outcome: true })).toBe('/my-applications?application=9')
  })

  it('sends a recruiter to the applicants, with the outcome dialog when asked', () => {
    expect(callExitHref({ role: 'recruiter', postId: 3, applicationId: 9 })).toBe('/my-hiring-posts/3/applicants?application=9')
    expect(callExitHref({ role: 'recruiter', postId: 3, applicationId: 9, outcome: true })).toBe(
      '/my-hiring-posts/3/applicants?application=9&outcome=1',
    )
  })
})

function conflict(message: string, status = 409) {
  return new AxiosError('x', 'ERR', undefined, undefined, {
    status,
    data: { message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('isAlreadyCompleted', () => {
  it('is true for the 409 that says the interview was already completed', () => {
    expect(isAlreadyCompleted(conflict('This interview was already completed.'))).toBe(true)
  })

  it('is false for other errors', () => {
    expect(isAlreadyCompleted(conflict('This interview was already cancelled.'))).toBe(false)
    expect(isAlreadyCompleted(conflict('This interview was already completed.', 400))).toBe(false)
    expect(isAlreadyCompleted(new Error('network'))).toBe(false)
  })
})
