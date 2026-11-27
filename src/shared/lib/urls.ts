/**
 * Parses and validates HTTP(S) URLs for external profile links and relative backend asset paths.
 * Rejects non-HTTP schemes and returns undefined when a URL is empty or invalid.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/users/components/profile/profile-page.tsx
 *   - shared/lib/seo-jsonld.ts
 *   - shared/lib/seo.tsx
 *   - shared/lib/utils.ts
 */

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/i

export function resolveHttpUrl(
  value: string | null | undefined,
  baseUrl?: string,
) {
  const source = value?.trim()
  if (!source) return undefined

  try {
    const normalized = baseUrl
      ? source.replaceAll('\\', '/')
      : source.startsWith('//')
        ? `https:${source}`
        : URL_SCHEME.test(source)
          ? source
          : `https://${source}`
    const url = baseUrl ? new URL(normalized, normalizedBaseUrl(baseUrl)) : new URL(normalized)

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : undefined
  } catch {
    return undefined
  }
}

export function safeExternalUrl(value: string | null | undefined) {
  return resolveHttpUrl(value)
}

function normalizedBaseUrl(value: string) {
  return value.endsWith('/') ? value : `${value}/`
}
