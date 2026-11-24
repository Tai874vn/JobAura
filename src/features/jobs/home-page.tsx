import { Suspense } from 'react'
import { BrowseSection } from './home/browse-section'
import { CtaBand } from './home/cta-band'
import { FaqSection } from './home/faq'
import { FeaturedServices } from './home/featured-services'
import { FeaturedServicesSkeleton } from './home/home-skeletons'
import { HowItWorks } from './home/how-it-works'
import { LandingHero } from './home/hero'
import { ScoreBreakdown } from './home/score-breakdown'

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
