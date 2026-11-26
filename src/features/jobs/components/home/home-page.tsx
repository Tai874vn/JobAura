import { Suspense } from 'react'
import { BrowseSection } from './browse-section'
import { CtaBand } from './cta-band'
import { FaqSection } from './faq'
import { FeaturedServices } from './featured-services'
import { FeaturedServicesSkeleton } from './home-skeletons'
import { HowItWorks } from './how-it-works'
import { LandingHero } from './hero'
import { ScoreBreakdown } from './score-breakdown'

export function HomePage() {
  return (
    <div>
      <LandingHero />
      <ScoreBreakdown />
      <HowItWorks />
      <BrowseSection />
      {/* Stream top-rated portfolios inside Suspense (async server boundary) so static sections paint immediately. */}
      <Suspense fallback={<FeaturedServicesSkeleton />}>
        <FeaturedServices />
      </Suspense>
      <FaqSection />
      <CtaBand />
    </div>
  )
}
