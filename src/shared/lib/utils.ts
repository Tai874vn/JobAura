import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { AxiosError } from 'axios'
import { env } from '@/shared/config/env'
import { resolveHttpUrl } from './urls'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: unknown } | undefined
    // A validation error (400) sends a list of sentences; the first one is enough to show.
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message
    return typeof message === 'string' && message ? message : fallback
  }

  return error instanceof Error ? error.message : fallback
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
