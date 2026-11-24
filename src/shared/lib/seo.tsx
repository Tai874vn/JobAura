import type { Metadata } from 'next'
import { resolveHttpUrl } from './urls'

const defaultSiteUrl = 'http://localhost:3000'
const defaultDescription = 'Find a role, show your work, or hire the right person, with AI matching built in.'

/** The shared preview picture made by src/app/opengraph-image.tsx (keep the size and text the same there). */
export const defaultShareImage = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'JobAura: find a role, show your work, or hire the right person',
} as const

export type PageMetadataInput = {
  title: string
  description: string
  canonical: string
  type?: 'website' | 'profile'
  image?: string
  imageAlt?: string
  robots?: Metadata['robots']
}

/**
 * Builds the same set of page metadata for every public page: the title, the description, the canonical URL
 * (the one address search engines should list), Open Graph (the preview card on Facebook, LinkedIn, chat apps)
 * and the Twitter card. With no `image`, the card uses the shared picture from src/app/opengraph-image.tsx. It is
 * named here on purpose: a page that sets its own `openGraph` replaces the layout's, picture included.
 */
export function buildPageMetadata({
  title,
  description,
  canonical,
  type = 'website',
  image,
  imageAlt,
  robots,
}: PageMetadataInput): Metadata {
  // The layout's title template adds " | JobAura" to the tab title; preview cards do not use the template.
  const fullTitle = `${title} | JobAura`
  const picture = image
    ? { url: image, alt: imageAlt ?? title }
    : { url: defaultShareImage.url, width: defaultShareImage.width, height: defaultShareImage.height, alt: defaultShareImage.alt }

  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: { canonical },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: 'JobAura',
      type,
      images: [picture],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [picture.url],
    },
  }
}

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
