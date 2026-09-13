import type { Metadata } from 'next'
import { HomePage } from '@/features/jobs/home-page'
import { landingFaqs } from '@/features/jobs/home/faq'
import { JsonLd, faqJsonLd, organizationJsonLd, websiteJsonLd } from '@/shared/lib/seo'

export const metadata: Metadata = {
  title: 'Hire trusted freelance talent',
  description:
    'Browse trusted freelance services, connect with skilled professionals, and hire with confidence on JobAura.',
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
