import { BrowseSection } from './home/browse-section'
import { CtaBand } from './home/cta-band'
import { FaqSection } from './home/faq'
import { FeaturedServices } from './home/featured-services'
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
      <FeaturedServices />
      <FaqSection />
      <CtaBand />
    </div>
  )
}
