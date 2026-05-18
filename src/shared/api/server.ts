import { cookies } from 'next/headers'
import { env } from '@/shared/config/env'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object
  next?: NextFetchRequestConfig
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
  const headers = new Headers(options.headers)
  const cookieHeader = (await cookies()).toString()

  if (cookieHeader) headers.set('cookie', cookieHeader)
  if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...options,
      headers,
      body:
        options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
          ? JSON.stringify(options.body)
          : (options.body as BodyInit | undefined),
      credentials: 'include',
      cache: options.cache ?? 'no-store',
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
