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
