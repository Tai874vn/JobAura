import type { NextRequest } from 'next/server'
import { proxyApiRequest } from '@/shared/api/server-proxy'

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxyApiRequest(request, path)
}

export const GET = proxyRequest
export const HEAD = proxyRequest
export const OPTIONS = proxyRequest
export const POST = proxyRequest
export const PATCH = proxyRequest
export const PUT = proxyRequest
export const DELETE = proxyRequest
