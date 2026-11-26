import { describe, expect, it } from 'vitest'
import { classifyServerFailure, resolveServerEntity } from '../server-load'

describe('classifyServerFailure', () => {
  it('treats 404 and 403 as not-found', () => {
    expect(classifyServerFailure({ ok: false, status: 404, statusText: 'Not Found', error: 'Missing' })).toEqual({
      kind: 'not-found',
    })
    expect(classifyServerFailure({ ok: false, status: 403, statusText: 'Forbidden', error: 'Denied' })).toEqual({
      kind: 'not-found',
    })
  })

  it('treats 401 as error by default, or not-found when allowed for owner-only fallback reads', () => {
    expect(classifyServerFailure({ ok: false, status: 401, statusText: 'Unauthorized', error: 'Sign in' })).toEqual({
      kind: 'error',
      status: 401,
      message: 'Sign in',
    })
    expect(
      classifyServerFailure(
        { ok: false, status: 401, statusText: 'Unauthorized', error: 'Sign in' },
        { treatUnauthorizedAsNotFound: true },
      ),
    ).toEqual({ kind: 'not-found' })
  })

  it('treats 5xx responses and network outages (status 0) as errors instead of 404s', () => {
    expect(
      classifyServerFailure({ ok: false, status: 503, statusText: 'Service Unavailable', error: ['Backend restarting'] }),
    ).toEqual({
      kind: 'error',
      status: 503,
      message: 'Backend restarting',
    })

    expect(
      classifyServerFailure({ ok: false, status: 0, statusText: 'Network error', error: 'ECONNREFUSED' }),
    ).toEqual({
      kind: 'error',
      status: 0,
      message: 'ECONNREFUSED',
    })
  })
})

describe('resolveServerEntity', () => {
  it('returns ok when the response succeeds and contains an entity', () => {
    const outcome = resolveServerEntity(
      { ok: true, status: 200, data: { content: { id: 7, name: 'Linh' } } },
      (data) => data.content,
    )
    expect(outcome).toEqual({ kind: 'ok', data: { id: 7, name: 'Linh' } })
  })

  it('returns not-found when an ok response has no entity', () => {
    const outcome = resolveServerEntity(
      { ok: true, status: 200, data: { content: null } },
      (data) => data.content,
    )
    expect(outcome).toEqual({ kind: 'not-found' })
  })

  it('propagates 5xx failures as error outcomes', () => {
    const outcome = resolveServerEntity(
      { ok: false, status: 500, statusText: 'Internal Server Error', error: 'Database offline' },
      (data: { content?: { id: number } }) => data.content,
    )
    expect(outcome).toEqual({ kind: 'error', status: 500, message: 'Database offline' })
  })
})
