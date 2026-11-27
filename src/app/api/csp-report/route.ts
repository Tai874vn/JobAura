/**
 * API route (/api/csp-report) that receives browser Content Security Policy violation reports.
 * Limits payload size to 64 KB, cleans reported URLs, logs normalized warnings, and returns 204.
 *
 * Calls: nothing from this project
 * Used by:
 *   - Next.js router: route for /api/csp-report
 */

import { NextResponse } from 'next/server'

const maxReportBodyBytes = 64 * 1024

export async function POST(request: Request) {
  if (declaredBodyTooLarge(request)) {
    return NextResponse.json({ message: 'CSP report is too large' }, { status: 413 })
  }

  const body = await readLimitedText(request, maxReportBodyBytes)
  if (!body.ok) {
    return NextResponse.json({ message: 'CSP report is too large' }, { status: 413 })
  }

  try {
    const payload = JSON.parse(body.text) as unknown
    const reports = Array.isArray(payload) ? payload : [payload]
    const normalizedReports = reports.map(normalizeCspReport).filter(Boolean)

    if (normalizedReports.length) {
      console.warn('[CSP Report-Only]', JSON.stringify(normalizedReports))
    }
  } catch {
    console.warn('[CSP Report-Only] Invalid report payload')
  }

  return new NextResponse(null, { status: 204 })
}

function declaredBodyTooLarge(request: Request) {
  const contentLength = request.headers.get('content-length')
  if (!contentLength) return false
  const parsed = Number(contentLength)
  return Number.isFinite(parsed) && parsed > maxReportBodyBytes
}

async function readLimitedText(request: Request, maxBytes: number) {
  if (!request.body) return { ok: true, text: '' }

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    bytes += value.byteLength
    if (bytes > maxBytes) {
      await reader.cancel()
      return { ok: false, text: '' }
    }

    text += decoder.decode(value, { stream: true })
  }

  text += decoder.decode()
  return { ok: true, text }
}

function normalizeCspReport(value: unknown) {
  const body = reportBody(value)
  if (!body) return null

  return {
    effectiveDirective: pickString(body, 'effective-directive') ?? pickString(body, 'effectiveDirective'),
    violatedDirective: pickString(body, 'violated-directive') ?? pickString(body, 'violatedDirective'),
    blockedUri: sanitizeUrl(pickString(body, 'blocked-uri') ?? pickString(body, 'blockedURL')),
    documentUri: sanitizeUrl(pickString(body, 'document-uri') ?? pickString(body, 'documentURL')),
    sourceFile: sanitizeUrl(pickString(body, 'source-file') ?? pickString(body, 'sourceFile')),
    lineNumber: pickNumber(body, 'line-number') ?? pickNumber(body, 'lineNumber'),
  }
}

function reportBody(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null
  const legacyReport = value['csp-report']
  if (isRecord(legacyReport)) return legacyReport
  const reportBodyValue = value.body
  if (isRecord(reportBodyValue)) return reportBodyValue
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function pickString(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function pickNumber(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function sanitizeUrl(value: string | undefined) {
  if (!value || value === 'inline' || value === 'eval') return value

  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname}`
  } catch {
    return value.slice(0, 200)
  }
}
