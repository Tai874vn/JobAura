import type { ServerRequestResult } from './server'

export type ServerLoadOutcome<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'not-found' }
  | { kind: 'error'; status: number; message: string }

function formatServerError(error: string | string[], fallback: string): string {
  if (Array.isArray(error)) {
    const first = error.find((entry) => typeof entry === 'string' && entry.trim().length > 0)
    return first ?? fallback
  }
  return error.trim() || fallback
}

/**
 * Splits a failed server API response into "not found" (404/403, plus optional 401
 * for private owner-only fallbacks) versus a real outage (5xx or network error).
 * Pages call notFound() only for the first case and throw for the second so the
 * segment error boundary (error.tsx) can show a Try again screen.
 */
export function classifyServerFailure(
  result: Extract<ServerRequestResult<unknown>, { ok: false }>,
  options: { treatUnauthorizedAsNotFound?: boolean } = {},
): { kind: 'not-found' } | { kind: 'error'; status: number; message: string } {
  const notFoundStatuses = options.treatUnauthorizedAsNotFound ? [401, 403, 404] : [403, 404]
  if (notFoundStatuses.includes(result.status)) {
    return { kind: 'not-found' }
  }

  return {
    kind: 'error',
    status: result.status,
    message: formatServerError(result.error, result.statusText || 'Unable to load this page'),
  }
}

/**
 * Turns a ServerRequestResult into a three-way outcome (ok, not-found, or error)
 * so Server Components never misreport backend 5xx outages as HTTP 404 pages.
 */
export function resolveServerEntity<TResponse, TEntity>(
  result: ServerRequestResult<TResponse>,
  extract: (data: TResponse) => TEntity | null | undefined,
  options: { treatUnauthorizedAsNotFound?: boolean } = {},
): ServerLoadOutcome<TEntity> {
  if (!result.ok) return classifyServerFailure(result, options)

  const entity = extract(result.data)
  if (entity == null) return { kind: 'not-found' }

  return { kind: 'ok', data: entity }
}
