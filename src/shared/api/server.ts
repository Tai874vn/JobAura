/**
 * Server-side HTTP helper for calling the JobAura backend from Next.js server code.
 * Sends requests with optional session cookies, blocks shared caching of private responses, and reports 5xx or network errors to Sentry.
 *
 * Calls: getServerEnv; RequestError
 * Used by:
 *   - 13 files, for example app/(marketplace)/hiring-posts/[id]/page.tsx, app/(marketplace)/hiring-posts/page.tsx, app/(marketplace)/jobs/page.tsx
 */

import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { getServerEnv } from '@/shared/config/env'
import { RequestError } from '@/shared/lib/errors'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object
  next?: NextFetchRequestConfig
  includeCookies?: boolean
}

export type ServerRequestFailure = {
  ok: false
  status: number
  statusText: string
  error: string | string[]
  requestId?: string
  code?: string
}

export type ServerRequestResult<T> =
  | { ok: true; status: number; data: T }
  | ServerRequestFailure

const reportedServerResults = new WeakSet<object>()

function normalizeErrorMessage(error: unknown, fallback: string): string | string[] {
  if (typeof error === 'string' || Array.isArray(error)) return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' || Array.isArray(message)) return message
  }
  return fallback
}

function extractRequestId(body: unknown, response: Response): string | undefined {
  if (body && typeof body === 'object' && 'requestId' in body) {
    const requestId = (body as { requestId?: unknown }).requestId
    if (typeof requestId === 'string' && requestId.trim()) return requestId.trim()
  }
  const headerId = response.headers.get('x-request-id')?.trim()
  return headerId || undefined
}

function extractErrorCode(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'code' in body) {
    const code = (body as { code?: unknown }).code
    if (typeof code === 'string' && code.trim()) return code.trim()
  }
  return undefined
}

/**
 * Reports an unexpected backend 5xx or server-to-backend connectivity outage (status 0)
 * from a server-side request to Sentry once, tagged with the source and backend requestId.
 * Returns true when reported.
 */
export function reportServerRequestFailure(
  response: ServerRequestFailure,
  source: string,
  path: string,
): boolean {
  const isReportable = response.status === 0 || response.status >= 500
  if (!isReportable || reportedServerResults.has(response)) return false
  reportedServerResults.add(response)
  const rawMessage = Array.isArray(response.error) ? response.error.join('; ') : response.error
  const error = new RequestError(
    rawMessage || response.statusText || (response.status === 0 ? 'Network error' : `HTTP ${response.status}`),
    response.status,
    response.requestId,
    response.code,
    { reported: true },
  )
  Sentry.captureException(error, {
    tags: {
      source,
      ...(error.requestId ? { requestId: error.requestId } : {}),
    },
    extra: {
      path,
      status: response.status,
      ...(error.requestId ? { requestId: error.requestId } : {}),
      ...(response.code ? { code: response.code } : {}),
    },
  })
  return true
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()

  if (!text) return null
  if (!contentType.includes('application/json')) return text

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function serverRequest<T>(path: string, options: RequestOptions = {}): Promise<ServerRequestResult<T>> {
  const { backendApiBaseUrl } = getServerEnv()
  const { body: requestBody, includeCookies = true, ...requestOptions } = options
  const wantsDataCache =
    (typeof requestOptions.next?.revalidate === 'number' && requestOptions.next.revalidate > 0) ||
    Boolean(requestOptions.next?.tags?.length) ||
    requestOptions.cache === 'force-cache'

  // Refuse to put cookie-authenticated responses into Next.js's shared Data Cache,
  // which would risk leaking one user's data to another visitor.
  if (includeCookies && wantsDataCache) {
    throw new Error(
      `serverRequest(${path}): refusing to cache a request that forwards cookies. Pass includeCookies: false for public cached data.`,
    )
  }

  const headers = new Headers(requestOptions.headers)
  const cookieHeader = includeCookies ? (await cookies()).toString() : ''
  const cache = requestOptions.cache ?? (requestOptions.next ? undefined : 'no-store')

  if (cookieHeader) headers.set('cookie', cookieHeader)
  if (requestBody && !(requestBody instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  try {
    const response = await fetch(`${backendApiBaseUrl}${path}`, {
      ...requestOptions,
      headers,
      body:
        requestBody && !(requestBody instanceof FormData) && typeof requestBody !== 'string'
          ? JSON.stringify(requestBody)
          : (requestBody as BodyInit | undefined),
      credentials: 'include',
      cache,
    })

    const body = await readResponseBody(response)

    if (!response.ok) {
      const requestId = extractRequestId(body, response)
      const code = extractErrorCode(body)
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        error: normalizeErrorMessage(body, response.statusText || 'Request failed'),
        ...(requestId ? { requestId } : {}),
        ...(code ? { code } : {}),
      }
    }

    return { ok: true, status: response.status, data: body as T }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network error',
      error: normalizeErrorMessage(error, 'Unable to reach the API server'),
    }
  }
}
