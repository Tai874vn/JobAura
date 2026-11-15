import type { Metadata } from 'next'
import { HomePage } from '@/features/jobs/home-page'
import { landingFaqs } from '@/features/jobs/home/faq'
import { JsonLd, faqJsonLd, organizationJsonLd, websiteJsonLd } from '@/shared/lib/seo'

export const metadata: Metadata = {
  title: 'Find a role or hire the right person',
  description:
    'Apply to open roles, post your portfolio, or publish hiring posts and get candidates ranked by AI on JobAura.',
  alternates: {
    canonical: '/welcome',
  },
}

export default function WelcomePage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), faqJsonLd(landingFaqs)]} />
      <HomePage />
    </>
  )
}
