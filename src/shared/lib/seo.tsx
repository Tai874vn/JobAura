import { resolveHttpUrl } from './urls'

const defaultSiteUrl = 'http://localhost:3000'
const defaultDescription = 'Find trusted freelance services and manage work in one marketplace.'

export function siteOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl).origin
  } catch {
    return defaultSiteUrl
  }
}

export function absoluteSiteUrl(path = '/') {
  try {
    return new URL(path, siteOrigin()).toString()
  } catch {
    return siteOrigin()
  }
}

export function absoluteAssetUrl(value: string | null | undefined) {
  const source = value?.trim()
  if (!source) return undefined

  const assetBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.BACKEND_API_BASE_URL ?? siteOrigin()
  return resolveHttpUrl(source, assetBase)
}

export function seoDescription(value: string | null | undefined, fallback = defaultDescription, maxLength = 155) {
  const text = (value || fallback).replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}...`
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteSiteUrl('/#organization'),
    name: 'JobAura',
    url: absoluteSiteUrl('/welcome'),
    description: defaultDescription,
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteSiteUrl('/#website'),
    name: 'JobAura',
    url: absoluteSiteUrl('/welcome'),
    potentialAction: {
      '@type': 'SearchAction',
      target: `${absoluteSiteUrl('/jobs')}?keyword={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
