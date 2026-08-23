import { NextResponse, type NextRequest } from 'next/server'
import { getServerEnv } from '@/shared/config/env'

const REQUEST_HEADERS_TO_REMOVE = [
  'accept-encoding',
  'connection',
  'content-length',
  'forwarded',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
] as const

const RESPONSE_HEADERS_TO_REMOVE = [
  'connection',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
] as const

type StreamingRequestInit = RequestInit & { duplex?: 'half' }
type HeadersWithSetCookie = Headers & { getSetCookie?: () => string[] }

export function buildBackendApiUrl(
  requestUrl: URL,
  path: readonly string[],
  backendApiBaseUrl: string,
) {
  const targetUrl = new URL(backendApiBaseUrl)
  targetUrl.pathname = `/api/${path.map(encodeURIComponent).join('/')}`
  targetUrl.search = requestUrl.search
  targetUrl.hash = ''
  return targetUrl
}

export function createProxyRequestHeaders(request: NextRequest) {
  const originalForwardedFor = request.headers.get('x-forwarded-for')
  const originalHost = firstHeaderValue(request.headers.get('x-forwarded-host'))
    ?? request.headers.get('host')
    ?? request.nextUrl.host
  const originalProto = firstHeaderValue(request.headers.get('x-forwarded-proto'))
    ?? request.nextUrl.protocol.slice(0, -1)
  const headers = sanitizedHeaders(request.headers, REQUEST_HEADERS_TO_REMOVE)

  // Prevent the server-side fetch implementation from transparently decoding a
  // compressed body while leaving the backend's content-encoding header intact.
  headers.set('accept-encoding', 'identity')
  headers.set('x-forwarded-host', originalHost)
  headers.set('x-forwarded-proto', originalProto)
  if (originalForwardedFor) headers.set('x-forwarded-for', originalForwardedFor)

  return headers
}

export function createProxyResponseHeaders(source: Headers) {
  const headers = sanitizedHeaders(source, RESPONSE_HEADERS_TO_REMOVE)
  const getSetCookie = (source as HeadersWithSetCookie).getSetCookie

  if (typeof getSetCookie === 'function') {
    const cookies = getSetCookie.call(source)
    if (cookies.length > 0) {
      headers.delete('set-cookie')
      cookies.forEach((cookie) => headers.append('set-cookie', cookie))
    }
  }

  return headers
}

export async function proxyApiRequest(
  request: NextRequest,
  path: readonly string[],
) {
  try {
    const { backendApiBaseUrl } = getServerEnv()
    const targetUrl = buildBackendApiUrl(request.nextUrl, path, backendApiBaseUrl)
    const hasBody =
      request.method !== 'GET'
      && request.method !== 'HEAD'
      && request.body !== null
    const requestInit: StreamingRequestInit = {
      method: request.method,
      headers: createProxyRequestHeaders(request),
      body: hasBody ? request.body : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: request.signal,
    }

    if (hasBody) requestInit.duplex = 'half'

    const response = await fetch(targetUrl, requestInit)

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: createProxyResponseHeaders(response.headers),
    })
  } catch (error) {
    console.warn('[API proxy] Unable to reach backend API', {
      method: request.method,
      path: request.nextUrl.pathname,
      error,
    })

    return NextResponse.json(
      { message: 'Unable to reach backend API' },
      { status: 502 },
    )
  }
}

function sanitizedHeaders(source: Headers, names: readonly string[]) {
  const headers = new Headers(source)
  const connectionHeaders = headers.get('connection')
    ?.split(',')
    .map((name) => name.trim())
    .filter(Boolean) ?? []
  const headersToRemove = [...names, ...connectionHeaders]

  headersToRemove.forEach((name) => headers.delete(name))
  return headers
}

function firstHeaderValue(value: string | null) {
  return value?.split(',', 1)[0]?.trim() || null
}
