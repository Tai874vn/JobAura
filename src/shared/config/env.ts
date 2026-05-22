function requireValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}

export const env = {
  apiBaseUrl: requireValue('NEXT_PUBLIC_API_BASE_URL', process.env.NEXT_PUBLIC_API_BASE_URL),
  googleClientId: requireValue('NEXT_PUBLIC_GOOGLE_CLIENT_ID', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
} as const

export function getServerEnv() {
  return {
    backendApiBaseUrl: requireValue('BACKEND_API_BASE_URL', process.env.BACKEND_API_BASE_URL),
  } as const
}