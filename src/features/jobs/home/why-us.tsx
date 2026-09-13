import { Bookmark, MessagesSquare, Sparkles, Star } from 'lucide-react'
import { Card, CardContent, Section, SectionHeading } from '@/shared/ui'

const features = [
  {
    icon: Sparkles,
    title: 'AI matching',
    text: 'Smart recommendations pair recruiters with the right candidates and workers with the right jobs.',
  },
  {
    icon: MessagesSquare,
    title: 'Real-time chat',
    text: 'Talk instantly with clients and professionals — scope, negotiate, and decide without leaving JobAura.',
  },
  {
    icon: Star,
    title: 'Verified ratings',
    text: 'Every service shows real star ratings and comments from completed work, so you can hire with confidence.',
  },
  {
    icon: Bookmark,
    title: 'Save & compare',
    text: 'Bookmark services, posts, and candidates, then compare your shortlist side by side before committing.',
  },
]

export function WhyJobAura() {
  return (
    <Section tone="surface">
      <SectionHeading
        eyebrow="Why JobAura"
        title="Everything working together"
        description="One workspace for finding talent, running projects, and building your reputation."
      />
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}
