import axios from 'axios'

export type UserErrorKind =
  | 'validation'
  | 'auth'
  | 'not-found'
  | 'conflict'
  | 'server'
  | 'network'

export type UserError = {
  message: string
  requestId?: string
  status?: number
  kind: UserErrorKind
}

const DEFAULT_SERVER_MESSAGE = 'Something went wrong. Please try again.'
const DEFAULT_AUTH_MESSAGE = "You don't have access to this."
const DEFAULT_NOT_FOUND_MESSAGE = "We couldn't find that."
const DEFAULT_OFFLINE_MESSAGE = 'You seem to be offline.'
const DEFAULT_TIMEOUT_MESSAGE = 'The request timed out.'

// Auth error codes that the HTTP client handles itself (token refresh or sign-out).
// Users should never see raw auth-token messages for these codes.
const CLIENT_HANDLED_AUTH_CODES = new Set([
  'ACCESS_TOKEN_EXPIRED',
  'ACCESS_TOKEN_MISSING',
  'INVALID_ACCESS_TOKEN',
  'SESSION_REVOKED',
  'REFRESH_REUSED',
  'REFRESH_TOKEN_EXPIRED',
  'INVALID_REFRESH_TOKEN',
])

// Patterns that signal technical or internal details that should never be shown to users.
const UNSAFE_MESSAGE_PATTERNS: RegExp[] = [
  /[\r\n]/,
  /^\d{3}$/,
  /\b(?:https?|wss?|ftp):\/\/[A-Za-z0-9[\]_]|\bfile:\/\/(?:\/[^\s]+|[A-Za-z0-9[\]_])/i,
  /\bwww\./i,
  /(?:^|[\s('"`:])\/(?:api|v\d+|src|app|dist|node_modules|usr|var|etc|tmp|home|Users|opt)\b/i,
  /(?:^|\s)\/[a-z0-9_-]+\/[a-z0-9_./-]+/i,
  /[A-Za-z]:\\/,
  /\b[\w-]+\.(?:tsx?|jsx?|mjs|cjs|prisma|sql):\d+/i,
  /\bat\s+[\w.$<>]+\s*\(/,
  /^\s*Error:/,
  /\b(?:TypeError|ReferenceError|SyntaxError|RangeError|URIError|EvalError|AggregateError|AxiosError|ZodError)\b/,
  /Request failed with status code/i,
  /timeout of \d+\s*ms exceeded/i,
  /^Network Error$/i,
  /\b(?:ERR_BAD_REQUEST|ERR_BAD_RESPONSE|ERR_NETWORK|ERR_CANCELED|ECONNREFUSED|ECONNRESET|ECONNABORTED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE)\b/,
  /^\s*[{[]/,
  /\{"|\[".*?"\]|":/,
  /\bPrisma\w*/i,
  /\bP20\d{2}\b/,
  /\b(?:Unique|Foreign key) constraint failed\b/i,
  /\b(?:NestJS|HttpException|BadRequestException|UnauthorizedException|ForbiddenException|NotFoundException|ConflictException|InternalServerErrorException|ServiceUnavailableException|BadGatewayException|UnprocessableEntityException|ThrottlerException|QueryFailedError|Sequelize|TypeORM|Mongoose)\b/,
  /\b(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE)\b/,
  /\b(?:postgres(?:ql)?|mysql|sqlite|mongodb|redis)\s+(?:error|connection|client|server|timeout|driver)\b|\bSQLSTATE\b|\brelation\s+"[^"]+"\s+does\s+not\s+exist\b|\bduplicate\s+key\s+value\b/i,
  /\bstatusCode\b/,
]

const MAX_USER_MESSAGE_LENGTH = 300
const MAX_REQUEST_ID_LENGTH = 64

/**
 * Explicit error for intentional client-side validation or user-facing messages.
 * Plain Error instances from libraries or runtimes are never shown directly to users.
 */
export class UserValidationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'UserValidationError'
  }
}

/**
 * Structured error for requests that do not go through axios (such as server actions).
 * Keeping status, requestId, and code lets toUserError and Sentry reporting treat it like an HTTP error.
 */
export class RequestError extends Error {
  readonly status: number
  readonly requestId?: string
  readonly code?: string
  readonly reported: boolean

  constructor(
    message: string,
    status: number,
    requestId?: string,
    code?: string,
    options?: { reported?: boolean },
  ) {
    super(message)
    this.name = 'RequestError'
    this.status = status
    this.requestId = cleanRequestId(requestId)
    this.code = code
    this.reported = Boolean(options?.reported)
  }
}

/**
 * Returns true only when text is a short, plain sentence safe to show to users
 * (no URLs, paths, stack traces, JSON, status-code jargon, or backend/ORM names).
 */
export function isSafeUserMessage(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > MAX_USER_MESSAGE_LENGTH) return false
  return !UNSAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/**
 * Picks the first safe plain-English sentence from a string or string array,
 * or returns the fallback when the text is missing or looks internal.
 */
export function sanitizeUserMessage(value: unknown, fallback = DEFAULT_SERVER_MESSAGE): string {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate === 'string' && isSafeUserMessage(candidate)) {
    return candidate.trim()
  }
  return fallback
}

function cleanRequestId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > MAX_REQUEST_ID_LENGTH || /[\r\n]/.test(trimmed)) return undefined
  return trimmed
}

function withReference(message: string, requestId?: string): string {
  return requestId ? `${message} (ref: ${requestId})` : message
}

function readHeader(headers: unknown, name: string): unknown {
  if (!headers || typeof headers !== 'object') return undefined
  if ('get' in headers && typeof (headers as { get?: unknown }).get === 'function') {
    return (headers as { get: (key: string) => unknown }).get(name)
  }
  const record = headers as Record<string, unknown>
  const lower = name.toLowerCase()
  return (
    record[name] ??
    record[lower] ??
    Object.entries(record).find(([key]) => key.toLowerCase() === lower)?.[1]
  )
}

type BackendErrorBody = {
  statusCode?: unknown
  message?: unknown
  code?: unknown
  requestId?: unknown
}

function classifyHttpError(
  options: {
    status?: number
    message?: unknown
    code?: string
    requestId?: string
    isTimeout?: boolean
    hasResponse: boolean
  },
  fallback?: string,
): UserError {
  const { status, message, code, requestId, isTimeout, hasResponse } = options
  const safeFallback = fallback ?? DEFAULT_SERVER_MESSAGE

  if (isTimeout || status === 408) {
    return {
      message: withReference(DEFAULT_TIMEOUT_MESSAGE, requestId),
      ...(requestId ? { requestId } : {}),
      ...(status !== undefined ? { status } : {}),
      kind: 'network',
    }
  }

  if (!hasResponse || status === 0) {
    return {
      message: withReference(DEFAULT_OFFLINE_MESSAGE, requestId),
      ...(requestId ? { requestId } : {}),
      ...(status !== undefined ? { status } : {}),
      kind: 'network',
    }
  }

  if (status !== undefined && status >= 500) {
    return {
      message: withReference(DEFAULT_SERVER_MESSAGE, requestId),
      ...(requestId ? { requestId } : {}),
      status,
      kind: 'server',
    }
  }

  if (status === 404) {
    return {
      message: DEFAULT_NOT_FOUND_MESSAGE,
      ...(requestId ? { requestId } : {}),
      status,
      kind: 'not-found',
    }
  }

  if (status === 401 || status === 403) {
    const useBackendMessage = !(code && CLIENT_HANDLED_AUTH_CODES.has(code))
    const safeMessage = useBackendMessage ? sanitizeUserMessage(message, '') : ''
    return {
      message: safeMessage || DEFAULT_AUTH_MESSAGE,
      ...(requestId ? { requestId } : {}),
      status,
      kind: 'auth',
    }
  }

  if (status === 409) {
    return {
      message: sanitizeUserMessage(message, safeFallback),
      ...(requestId ? { requestId } : {}),
      status,
      kind: 'conflict',
    }
  }

  // Other 4xx validation/client errors.
  if (status !== undefined && status >= 400 && status < 500) {
    const safeMessage = sanitizeUserMessage(message, '')
    return {
      message: safeMessage || safeFallback,
      ...(requestId ? { requestId } : {}),
      status,
      kind: 'validation',
    }
  }

  return {
    message: withReference(DEFAULT_SERVER_MESSAGE, requestId),
    ...(requestId ? { requestId } : {}),
    ...(status !== undefined ? { status } : {}),
    kind: 'server',
  }
}

function toUserErrorInternal(error: unknown, fallback: string | undefined, seen: Set<unknown>): UserError {
  if (error && typeof error === 'object') {
    if (seen.has(error)) {
      return {
        message: fallback ?? DEFAULT_SERVER_MESSAGE,
        kind: 'server',
      }
    }
    seen.add(error)
  }

  if (axios.isAxiosError(error)) {
    const response = error.response
    const data = response?.data && typeof response.data === 'object'
      ? (response.data as BackendErrorBody)
      : undefined
    const rawStatus = response?.status ?? (typeof data?.statusCode === 'number' ? data.statusCode : undefined)
    const status = typeof rawStatus === 'number' ? rawStatus : undefined
    const requestId =
      cleanRequestId(data?.requestId) ??
      cleanRequestId(readHeader(response?.headers, 'x-request-id'))
    const code = typeof data?.code === 'string' ? data.code : undefined
    const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'

    return classifyHttpError(
      {
        status,
        message: data?.message,
        code,
        requestId,
        isTimeout,
        hasResponse: Boolean(response),
      },
      fallback,
    )
  }

  if (error instanceof RequestError) {
    return classifyHttpError(
      {
        status: error.status,
        message: error.message,
        code: error.code,
        requestId: error.requestId,
        hasResponse: error.status !== 0,
      },
      fallback,
    )
  }

  if (error instanceof UserValidationError) {
    const safeMessage = isSafeUserMessage(error.message) ? error.message.trim() : undefined
    if (error.cause !== undefined) {
      const causeError = toUserErrorInternal(error.cause, fallback, seen)
      const needsRef = causeError.kind === 'server' || causeError.kind === 'network'
      const message = safeMessage
        ? needsRef
          ? withReference(safeMessage, causeError.requestId)
          : safeMessage
        : causeError.message
      return {
        ...causeError,
        message,
      }
    }
    return {
      message: safeMessage ?? fallback ?? DEFAULT_SERVER_MESSAGE,
      kind: 'validation',
    }
  }

  if (error instanceof Error) {
    // Plain Error instances from libraries or runtimes are never shown directly to users.
    // If one wraps an underlying HTTP/server failure via `cause`, surface that failure cleanly.
    if (error.cause !== undefined) {
      return toUserErrorInternal(error.cause, fallback, seen)
    }
    return {
      message: fallback ?? DEFAULT_SERVER_MESSAGE,
      kind: 'server',
    }
  }

  return {
    message: fallback ?? DEFAULT_SERVER_MESSAGE,
    kind: 'server',
  }
}

/**
 * Single source of truth for turning any thrown error into safe, plain-English UI text.
 * Never exposes stack traces, URLs, API paths, raw axios messages, JSON, or backend class names.
 */
export function toUserError(error: unknown, fallback?: string): UserError {
  return toUserErrorInternal(error, fallback, new Set())
}

/**
 * Thin wrapper around toUserError for callers that only need the display string.
 */
export function getErrorMessage(error: unknown, fallback = DEFAULT_SERVER_MESSAGE): string {
  return toUserError(error, fallback).message
}
