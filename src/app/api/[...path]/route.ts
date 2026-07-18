import { NextResponse, type NextRequest } from 'next/server'
import { getServerEnv } from '@/shared/config/env'

const { backendApiBaseUrl } = getServerEnv()

const requestHeadersToStrip = [
  'accept-encoding',
  'connection',
  'content-length',
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
  'x-forwarded-proto',
  'x-real-ip',
]

const responseHeadersToStrip = [
  'connection',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetUrl = new URL(`/api/${path.join('/')}`, backendApiBaseUrl)
  targetUrl.search = request.nextUrl.search

  const headers = strippedHeaders(request.headers, requestHeadersToStrip)

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      redirect: 'manual',
    })

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: strippedHeaders(response.headers, responseHeadersToStrip),
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Unable to reach backend API' },
      { status: 502 }
    )
  }
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PATCH = proxyRequest
export const PUT = proxyRequest
export const DELETE = proxyRequest

function strippedHeaders(source: Headers, names: string[]) {
  const headers = new Headers(source)
  names.forEach((name) => headers.delete(name))
  return headers
}
