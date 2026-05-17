import { cookies } from 'next/headers'
import { env } from '@/shared/config/env'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object
  next?: NextFetchRequestConfig
}

export async function serverRequest<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
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

    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}
