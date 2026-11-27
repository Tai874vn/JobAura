/**
 * Reads and validates the required API environment variables for client and server code.
 * Checks that API base URLs are valid HTTP(S) origins with no path, query, or credentials.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/auth/components/auth-forms.tsx
 *   - features/auth/components/realtime-provider.tsx
 *   - shared/api/client.ts
 *   - shared/api/server-proxy.ts
 *   - shared/api/server.ts
 *   - shared/lib/utils.ts
 */

function requireValue(name: string, value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) {
    throw new Error(`${name} is required`)
  }

  return normalized
}

export function requireHttpBaseUrl(name: string, value: string | undefined) {
  const source = requireValue(name, value)

  try {
    const url = new URL(source)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.username
      || url.password
      || url.pathname !== '/'
      || url.search
      || url.hash
    ) {
      throw new Error('Invalid HTTP base URL')
    }

    return url.origin
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) origin without credentials, a path, query parameters, or a fragment`)
  }
}

export const env = {
  apiBaseUrl: requireHttpBaseUrl('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL),
  useSameOriginApi: process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API === 'true',
} as const

export function getServerEnv() {
  return {
    backendApiBaseUrl: requireHttpBaseUrl('BACKEND_API_BASE_URL', process.env.BACKEND_API_BASE_URL),
  } as const
}
