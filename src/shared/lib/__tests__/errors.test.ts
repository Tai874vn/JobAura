import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { getErrorMessage, RequestError, sanitizeUserMessage, toUserError, UserValidationError } from '../errors'

function axiosError(
  status: number | undefined,
  data?: unknown,
  options: { message?: string; code?: string; headers?: Record<string, string> } = {},
) {
  const config = {} as InternalAxiosRequestConfig
  return new AxiosError(
    options.message ?? (status ? `Request failed with status code ${status}` : 'Network Error'),
    options.code ?? (status ? 'ERR_BAD_REQUEST' : 'ERR_NETWORK'),
    config,
    undefined,
    status !== undefined
      ? {
          status,
          statusText: 'Error',
          data,
          headers: options.headers ?? {},
          config,
        }
      : undefined,
  )
}

describe('toUserError', () => {
  it('returns plain backend message for 4xx validation errors and uses the first item for arrays', () => {
    const single = toUserError(axiosError(400, { statusCode: 400, message: 'Email is already taken.', requestId: 'req-400' }))
    expect(single).toEqual({
      message: 'Email is already taken.',
      requestId: 'req-400',
      status: 400,
      kind: 'validation',
    })

    const list = toUserError(
      axiosError(422, {
        statusCode: 422,
        message: ['Password must be at least 10 characters.', 'Email must be valid.'],
      }),
    )
    expect(list).toEqual({
      message: 'Password must be at least 10 characters.',
      status: 422,
      kind: 'validation',
    })

    const emptyList = toUserError(axiosError(400, { statusCode: 400, message: [] }), 'Check your form.')
    expect(emptyList).toEqual({
      message: 'Check your form.',
      status: 400,
      kind: 'validation',
    })
  })

  it('handles 401 and 403 with plain messages, missing messages, and client-handled auth codes', () => {
    expect(toUserError(axiosError(401, { statusCode: 401, message: 'Invalid email or password.' }))).toEqual({
      message: 'Invalid email or password.',
      status: 401,
      kind: 'auth',
    })

    expect(toUserError(axiosError(401, { statusCode: 401 }))).toEqual({
      message: "You don't have access to this.",
      status: 401,
      kind: 'auth',
    })

    expect(toUserError(axiosError(403, { statusCode: 403, message: '' }))).toEqual({
      message: "You don't have access to this.",
      status: 403,
      kind: 'auth',
    })

    for (const code of ['ACCESS_TOKEN_EXPIRED', 'SESSION_REVOKED', 'REFRESH_REUSED']) {
      expect(
        toUserError(axiosError(401, { statusCode: 401, code, message: 'JWT token expired in guard' })),
      ).toEqual({
        message: "You don't have access to this.",
        status: 401,
        kind: 'auth',
      })
    }
  })

  it('returns the fixed not-found message for 404 responses', () => {
    expect(
      toUserError(axiosError(404, { statusCode: 404, message: 'Cannot GET /api/jobs/999', requestId: 'req-404' })),
    ).toEqual({
      message: "We couldn't find that.",
      requestId: 'req-404',
      status: 404,
      kind: 'not-found',
    })
  })

  it('classifies 409 conflicts and preserves safe conflict sentences', () => {
    expect(
      toUserError(axiosError(409, { statusCode: 409, message: 'You already have an open proposal for this service.' })),
    ).toEqual({
      message: 'You already have an open proposal for this service.',
      status: 409,
      kind: 'conflict',
    })
  })

  it('returns a fixed friendly message for 5xx responses and appends requestId when present', () => {
    const withBodyRef = toUserError(
      axiosError(500, {
        statusCode: 500,
        message: 'Internal database failure on Prisma',
        requestId: 'req-500-abc',
      }),
    )
    expect(withBodyRef).toEqual({
      message: 'Something went wrong. Please try again. (ref: req-500-abc)',
      requestId: 'req-500-abc',
      status: 500,
      kind: 'server',
    })

    const withHeaderRef = toUserError(
      axiosError(502, { message: 'Bad Gateway' }, { headers: { 'x-request-id': 'hdr-502' } }),
    )
    expect(withHeaderRef).toEqual({
      message: 'Something went wrong. Please try again. (ref: hdr-502)',
      requestId: 'hdr-502',
      status: 502,
      kind: 'server',
    })

    const withTitleCaseHeaderRef = toUserError(
      axiosError(502, { message: 'Bad Gateway' }, { headers: { 'X-Request-ID': 'hdr-title-502' } }),
    )
    expect(withTitleCaseHeaderRef).toEqual({
      message: 'Something went wrong. Please try again. (ref: hdr-title-502)',
      requestId: 'hdr-title-502',
      status: 502,
      kind: 'server',
    })

    const withoutRef = toUserError(axiosError(503, { message: 'Service Unavailable' }))
    expect(withoutRef).toEqual({
      message: 'Something went wrong. Please try again.',
      status: 503,
      kind: 'server',
    })
  })

  it('classifies an axios response with missing status as a server error instead of validation', () => {
    const config = {} as InternalAxiosRequestConfig
    const statusless = new AxiosError(
      'Unexpected response',
      'ERR_BAD_RESPONSE',
      config,
      undefined,
      {
        status: undefined as unknown as number,
        statusText: '',
        data: { message: 'Internal response detail', requestId: 'req-no-status' },
        headers: {},
        config,
      },
    )

    expect(toUserError(statusless)).toEqual({
      message: 'Something went wrong. Please try again. (ref: req-no-status)',
      requestId: 'req-no-status',
      kind: 'server',
    })
  })

  it('returns friendly network messages for offline and timeout errors', () => {
    expect(toUserError(axiosError(undefined, undefined, { code: 'ERR_NETWORK', message: 'Network Error' }))).toEqual({
      message: 'You seem to be offline.',
      kind: 'network',
    })

    expect(
      toUserError(axiosError(undefined, undefined, { code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' })),
    ).toEqual({
      message: 'The request timed out.',
      kind: 'network',
    })

    expect(toUserError(axiosError(undefined, undefined, { code: 'ETIMEDOUT', message: 'timeout' }))).toEqual({
      message: 'The request timed out.',
      kind: 'network',
    })

    expect(toUserError(axiosError(408, { statusCode: 408, requestId: 'req-408' }))).toEqual({
      message: 'The request timed out. (ref: req-408)',
      requestId: 'req-408',
      status: 408,
      kind: 'network',
    })
  })

  it('rejects unsafe messages containing URLs, paths, stacks, JSON, Prisma, DB errors, or status jargon', () => {
    const unsafeMessages = [
      'See https://internal.jobaura.local/api/users',
      'Could not open file:///etc/passwd',
      'Cannot POST /api/contracts/12/fund',
      'Error: failed\n    at UserService.find (users.service.ts:42:10)',
      'at OrderController.create (order.controller.ts:18)',
      '{"statusCode":400,"error":"Bad Request"}',
      'Invalid PrismaClientKnownRequestError invocation on table users',
      'Prisma P2002 Unique constraint failed on the fields: (`email`)',
      'PostgreSQL connection refused',
      'Redis timeout while reading session',
      'MySQL error 1062',
      'SQLSTATE 23505',
      'relation "users" does not exist',
      'duplicate key value violates unique constraint',
      'Request failed with status code 500',
      '503',
    ]

    for (const unsafe of unsafeMessages) {
      const result = toUserError(axiosError(400, { statusCode: 400, message: unsafe }), 'Please try again.')
      expect(result.message, `should reject: ${unsafe}`).toBe('Please try again.')
      expect(result.kind).toBe('validation')
    }

    expect(toUserError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toEqual({
      message: 'Something went wrong. Please try again.',
      kind: 'server',
    })
  })

  it('keeps plain 4xx messages mentioning tech skills, certifications, or scheme hints', () => {
    const safeMessages = [
      'Choose skills from the list. Not recognised: PostgreSQL, Redis, C++, Node.js',
      'MongoDB Developer: the expiry date is before the issue date',
      'MySQL Database Administrator: enter a valid issue date.',
      'SQLite is already on your profile.',
      'Links must start with http:// or https://.',
    ]

    for (const safe of safeMessages) {
      const result = toUserError(axiosError(400, { statusCode: 400, message: safe }), 'Fallback')
      expect(result.message, `should keep: ${safe}`).toBe(safe)
      expect(result.kind).toBe('validation')
    }
  })

  it('hides messages from arbitrary plain Error instances and only surfaces UserValidationError', () => {
    const libraryErrors = [
      new Error('An error occurred in the Server Components render. The specific message is omitted in production builds.'),
      new Error("Can't find end of central directory : is this a zip file ?"),
      new Error('Failed to fetch'),
      new Error('Load failed'),
      new Error('Realtime ticket was not returned'),
    ]

    for (const error of libraryErrors) {
      expect(toUserError(error, 'Could not complete request.')).toEqual({
        message: 'Could not complete request.',
        kind: 'server',
      })
    }

    expect(toUserError(new UserValidationError('Fill at least one resume field before saving.'))).toEqual({
      message: 'Fill at least one resume field before saving.',
      kind: 'validation',
    })
  })

  it('preserves kind, status, and requestId when an error wraps a 5xx or network failure via cause', () => {
    const uploadFailure = axiosError(500, {
      statusCode: 500,
      message: 'Internal storage error',
      requestId: 'req-upload-500',
    })
    const wrappedValidation = new UserValidationError(
      'Resume details were saved, but the file upload failed. Your attachment is kept so you can retry.',
      { cause: uploadFailure },
    )
    expect(toUserError(wrappedValidation)).toEqual({
      message:
        'Resume details were saved, but the file upload failed. Your attachment is kept so you can retry. (ref: req-upload-500)',
      requestId: 'req-upload-500',
      status: 500,
      kind: 'server',
    })

    const timeoutCause = axiosError(408, { statusCode: 408, requestId: 'req-408' })
    expect(
      toUserError(new UserValidationError('Details saved, but upload timed out.', { cause: timeoutCause })),
    ).toEqual({
      message: 'Details saved, but upload timed out. (ref: req-408)',
      requestId: 'req-408',
      status: 408,
      kind: 'network',
    })

    const plainWrapper = new Error('Internal wrapper detail', { cause: uploadFailure })
    expect(toUserError(plainWrapper)).toEqual({
      message: 'Something went wrong. Please try again. (ref: req-upload-500)',
      requestId: 'req-upload-500',
      status: 500,
      kind: 'server',
    })

    // Circular causes must never recurse infinitely.
    const circular = new Error('Loop')
    ;(circular as Error & { cause?: unknown }).cause = circular
    expect(toUserError(circular, 'Fallback')).toEqual({
      message: 'Fallback',
      kind: 'server',
    })
  })

  it('handles structured RequestError instances from server actions including auth codes', () => {
    expect(toUserError(new RequestError('Not your post', 403))).toEqual({
      message: 'Not your post',
      status: 403,
      kind: 'auth',
    })
    expect(
      toUserError(
        new RequestError('Authentication session is invalid or revoked', 401, 'req-auth-1', 'SESSION_REVOKED'),
      ),
    ).toEqual({
      message: "You don't have access to this.",
      requestId: 'req-auth-1',
      status: 401,
      kind: 'auth',
    })
    expect(toUserError(new RequestError('Prisma failure', 500, 'req-sa-1'))).toEqual({
      message: 'Something went wrong. Please try again. (ref: req-sa-1)',
      requestId: 'req-sa-1',
      status: 500,
      kind: 'server',
    })
    expect(toUserError(new RequestError('connection refused', 0))).toEqual({
      message: 'You seem to be offline.',
      status: 0,
      kind: 'network',
    })
  })
})

describe('getErrorMessage and sanitizeUserMessage', () => {
  it('wraps toUserError and respects custom fallbacks', () => {
    expect(getErrorMessage(axiosError(404))).toBe("We couldn't find that.")
    expect(getErrorMessage(null, 'Custom fallback')).toBe('Custom fallback')
    expect(getErrorMessage(new UserValidationError('Cover image must be 5.0 MB or smaller.'))).toBe(
      'Cover image must be 5.0 MB or smaller.',
    )
    expect(getErrorMessage(new Error('Raw library detail'), 'Could not save.')).toBe('Could not save.')
  })

  it('sanitizes standalone messages', () => {
    expect(sanitizeUserMessage('The AI service is unavailable right now.', 'Fallback')).toBe(
      'The AI service is unavailable right now.',
    )
    expect(sanitizeUserMessage('https://internal/ai failed', 'Fallback')).toBe('Fallback')
    expect(sanitizeUserMessage(undefined, 'Fallback')).toBe('Fallback')
  })
})
