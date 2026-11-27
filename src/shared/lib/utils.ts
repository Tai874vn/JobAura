/**
 * Common frontend utility helpers used across the app.
 * Merges Tailwind class names, extracts avatar initials, resolves backend asset URLs, checks localhost images, and re-exports error helpers.
 *
 * Calls: env; resolveHttpUrl; toUserError; getErrorMessage; getErrorCode; RequestError; UserValidationError
 * Used by:
 *   - 96 files, for example features/admin/components/admin-dashboard.tsx, features/admin/components/admin-resource-model.tsx, features/admin/components/admin-resource-page.tsx
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { env } from '@/shared/config/env'
import { resolveHttpUrl } from './urls'

export {
  getErrorCode,
  getErrorMessage,
  isSafeUserMessage,
  RequestError,
  sanitizeUserMessage,
  toUserError,
  UserValidationError,
  type UserError,
  type UserErrorKind,
} from './errors'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name: string | undefined) {
  return (name ?? 'JA')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function resolveAssetUrl(value: string | null | undefined) {
  const source = value?.trim()
  if (!source) return undefined
  return resolveHttpUrl(source, env.apiBaseUrl)
}

export function shouldBypassImageOptimizer(value: string | null | undefined) {
  const source = resolveAssetUrl(value)
  if (!source) return false

  try {
    const url = new URL(source)
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}
