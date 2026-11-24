import { cookies } from 'next/headers'
import { getServerEnv } from '@/shared/config/env'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object
  next?: NextFetchRequestConfig
  includeCookies?: boolean
}

export type ServerRequestResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; statusText: string; error: string | string[] }

function normalizeErrorMessage(error: unknown, fallback: string): string | string[] {
  if (typeof error === 'string' || Array.isArray(error)) return error
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' || Array.isArray(message)) return message
  }
  return fallback
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
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        error: normalizeErrorMessage(body, response.statusText || 'Request failed'),
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
