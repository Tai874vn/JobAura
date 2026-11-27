/**
 * Builds schema.org JSON-LD structured data for public listing, hiring post, portfolio service, and profile pages.
 * Omits private contact fields and formats priced services in credits instead of USD.
 *
 * Calls: credits; safeExternalUrl; absoluteAssetUrl; absoluteSiteUrl; seoDescription
 * Used by:
 *   - app/(marketplace)/hiring-posts/[id]/page.tsx
 *   - app/(marketplace)/hiring-posts/page.tsx
 *   - app/(marketplace)/jobs/page.tsx
 *   - app/jobs/[id]/page.tsx
 *   - app/profile/[id]/page.tsx
 */

import { credits } from '@/shared/lib/credits'
import { safeExternalUrl } from '@/shared/lib/urls'
import type { Comment, HiringPost, Job, UserProfile } from '@/shared/schemas'
import { absoluteAssetUrl, absoluteSiteUrl, seoDescription } from './seo'

/**
 * Schema.org JSON-LD (structured data scripts read by search engines) for JobAura's public pages.
 * Keeps private contact fields (email, phone, birthday) out of search data and never labels credit
 * prices as USD.
 */

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  'full-time': 'FULL_TIME',
  'full time': 'FULL_TIME',
  full_time: 'FULL_TIME',
  'part-time': 'PART_TIME',
  'part time': 'PART_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  contractor: 'CONTRACTOR',
  freelance: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  internship: 'INTERN',
  intern: 'INTERN',
  volunteer: 'VOLUNTEER',
}

const SALARY_PERIOD_MAP: Record<string, string> = {
  hour: 'HOUR',
  month: 'MONTH',
  year: 'YEAR',
}

/** Maps a human label like "Full-time" to the schema.org JobPosting enum (e.g. "FULL_TIME"). */
export function schemaEmploymentType(value?: string | null): string | undefined {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return undefined
  return EMPLOYMENT_TYPE_MAP[normalized] ?? 'OTHER'
}

export function jobsItemListJsonLd(jobs: Array<Pick<Job, 'id' | 'title'>>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': absoluteSiteUrl('/jobs#portfolios'),
    name: 'Candidate portfolios on JobAura',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: jobs.length,
    itemListElement: jobs.map((job, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteSiteUrl(`/jobs/${job.id}`),
      name: job.title,
    })),
  }
}

export function hiringPostsItemListJsonLd(posts: Array<Pick<HiringPost, 'id' | 'title'>>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': absoluteSiteUrl('/hiring-posts#open-roles'),
    name: 'Open hiring posts on JobAura',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteSiteUrl(`/hiring-posts/${post.id}`),
      name: post.title,
    })),
  }
}

/**
 * Structured JobPosting data for an open hiring post.
 * Returns null for closed posts (which are private to the owner/admin and marked noindex).
 */
export function jobPostingJsonLd(post: HiringPost, now = new Date()) {
  if (post.status !== 'OPEN') return null
  // A post whose closing date has passed is no longer a live job offer, so it gets no JobPosting data.
  // A date with no time ("2026-12-31") means the post is open for that whole day.
  const closes = post.closesAt ? new Date(post.closesAt) : null
  const wholeDay = post.closesAt && /^\d{4}-\d{2}-\d{2}$/.test(post.closesAt) ? 24 * 60 * 60 * 1000 : 0
  if (closes && !Number.isNaN(closes.getTime()) && closes.getTime() + wholeDay <= now.getTime()) return null

  const rawLocation = post.location?.trim() || ''
  const isRemote = /\bremote\b/i.test(rawLocation)
  const isPureRemote = /^remote$/i.test(rawLocation)
  const hasSalaryMin = typeof post.salaryMin === 'number' && post.salaryMin > 0
  const hasSalaryMax = typeof post.salaryMax === 'number' && post.salaryMax > 0
  // The schema notes that posts saved before salary units existed are in USD, so USD is the real value there.
  const rawCurrency = post.salaryCurrency?.trim().toUpperCase()
  const currency = rawCurrency && /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : 'USD'
  const unitText = (post.salaryPeriod && SALARY_PERIOD_MAP[post.salaryPeriod]) || 'MONTH'

  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    '@id': absoluteSiteUrl(`/hiring-posts/${post.id}#job-posting`),
    identifier: {
      '@type': 'PropertyValue',
      name: 'JobAura',
      value: String(post.id),
    },
    title: post.title,
    description: post.description,
    datePosted: post.createdAt,
    validThrough: post.closesAt ?? undefined,
    employmentType: schemaEmploymentType(post.employmentType),
    directApply: true,
    hiringOrganization: {
      '@type': 'Organization',
      name: post.companyName || post.recruiter?.name || 'JobAura recruiter',
    },
    jobLocationType: isRemote ? 'TELECOMMUTE' : undefined,
    jobLocation:
      rawLocation && !isPureRemote
        ? {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              addressLocality: rawLocation,
            },
          }
        : undefined,
    baseSalary:
      hasSalaryMin || hasSalaryMax
        ? {
            '@type': 'MonetaryAmount',
            currency,
            value: {
              '@type': 'QuantitativeValue',
              minValue: hasSalaryMin ? post.salaryMin : undefined,
              maxValue: hasSalaryMax ? post.salaryMax : undefined,
              unitText,
            },
          }
        : undefined,
    skills: post.skills.length ? post.skills.join(', ') : undefined,
    url: absoluteSiteUrl(`/hiring-posts/${post.id}`),
  }
}

/**
 * Structured Service data for a portfolio post or priced service on `/jobs/[id]`.
 * Portfolio posts (price 0) omit `offers`; priced services describe their rate in credits
 * instead of falsely reporting `priceCurrency: "USD"`.
 */
export function serviceJsonLd(
  job: Job & { binhLuans?: Comment[] },
  seller: { name: string; href?: string | null },
) {
  const reviewCount = Math.max(job.reviews ?? 0, job.binhLuans?.length ?? 0)
  const ratingValue = job.rating ?? 0
  const hasPrice = typeof job.price === 'number' && job.price > 0
  const serviceArea = job.workMode !== 'REMOTE' ? job.serviceArea?.trim() || undefined : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': absoluteSiteUrl(`/jobs/${job.id}#service`),
    url: absoluteSiteUrl(`/jobs/${job.id}`),
    name: job.title,
    description: seoDescription(job.description || job.shortDescription, `Explore ${job.title} on JobAura.`, 500),
    image: absoluteAssetUrl(job.image),
    category: job.subcategory?.name,
    areaServed: serviceArea,
    provider: {
      '@type': 'Person',
      name: seller.name,
      url: seller.href ? absoluteSiteUrl(seller.href) : undefined,
    },
    offers: hasPrice
      ? {
          '@type': 'Offer',
          url: absoluteSiteUrl(`/jobs/${job.id}`),
          availability: 'https://schema.org/InStock',
          description: `From ${credits(job.price)}`,
        }
      : undefined,
    aggregateRating:
      ratingValue > 0 && reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue,
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  }
}

function extractProfileSkills(user: UserProfile): string[] {
  const legacy = user.skill
    ? user.skill
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    : []
  const structured = (user.profileSkills ?? user.skills ?? []).map((skill) => skill.name.trim()).filter(Boolean)
  return structured.length ? structured : legacy
}

/**
 * Structured Person data for a public `/profile/[id]` page.
 * Strictly omits private fields (email, phone, birthDay, gender) and describes priced offers
 * in credits rather than USD.
 */
export function personJsonLd(user: UserProfile, posts: Job[]) {
  const skills = extractProfileSkills(user)
  const websiteUrl = safeExternalUrl(user.website)
  const pricedOffers = posts
    .filter((job) => typeof job.price === 'number' && job.price > 0)
    .slice(0, 10)
    .map((job) => ({
      '@type': 'Offer',
      url: absoluteSiteUrl(`/jobs/${job.id}`),
      description: `From ${credits(job.price)}`,
      itemOffered: {
        '@type': 'Service',
        name: job.title,
        url: absoluteSiteUrl(`/jobs/${job.id}`),
      },
    }))

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': absoluteSiteUrl(`/profile/${user.id}#person`),
    name: user.name,
    url: absoluteSiteUrl(`/profile/${user.id}`),
    image: absoluteAssetUrl(user.avatar),
    jobTitle: user.headline?.trim() || undefined,
    description: seoDescription(user.bio || user.headline, `${user.name}'s public JobAura profile.`, 500),
    sameAs: websiteUrl ? [websiteUrl] : undefined,
    address: user.location?.trim()
      ? {
          '@type': 'PostalAddress',
          addressLocality: user.location.trim(),
        }
      : undefined,
    knowsAbout: skills.length ? skills : undefined,
    makesOffer: pricedOffers.length ? pricedOffers : undefined,
  }
}
