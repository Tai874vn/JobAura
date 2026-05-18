const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

if (!apiBaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is required in production')
}

export const env = {
  apiBaseUrl: apiBaseUrl ?? 'http://localhost:3000',
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
} as const
