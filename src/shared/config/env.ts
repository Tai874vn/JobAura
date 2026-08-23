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
  googleClientId: requireValue('NEXT_PUBLIC_GOOGLE_CLIENT_ID', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
} as const

export function getServerEnv() {
  return {
    backendApiBaseUrl: requireHttpBaseUrl('BACKEND_API_BASE_URL', process.env.BACKEND_API_BASE_URL),
  } as const
}
