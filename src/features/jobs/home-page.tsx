import { CategoryGrid } from './home/category-grid'
import { CtaBand } from './home/cta-band'
import { FaqSection } from './home/faq'
import { FeaturedServices } from './home/featured-services'
import { HowItWorks } from './home/how-it-works'
import { LandingHero } from './home/hero'
import { TrendingSkills } from './home/trending-skills'
import { WhyJobAura } from './home/why-us'

export function HomePage() {
  return (
    <div>
      <LandingHero />
      <TrendingSkills />
      <CategoryGrid />
      <FeaturedServices />
      <HowItWorks />
      <WhyJobAura />
      <FaqSection />
      <CtaBand />
    </div>
  )
}
