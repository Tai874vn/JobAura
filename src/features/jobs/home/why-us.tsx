import { Bookmark, MessagesSquare, Sparkles, Star } from 'lucide-react'
import { Card, CardContent, Section, SectionHeading } from '@/shared/ui'

const features = [
  {
    icon: Sparkles,
    title: 'AI matching',
    text: 'Roles ranked for each candidate’s resume, and candidates ranked for each hiring post.',
  },
  {
    icon: MessagesSquare,
    title: 'Real-time chat',
    text: 'Recruiters and candidates talk directly, without leaving JobAura.',
  },
  {
    icon: Star,
    title: 'Levels from the resume',
    text: 'Junior, Mid, or Senior is read from years in the field and the work described, with the reasons shown.',
  },
  {
    icon: Bookmark,
    title: 'Save & compare',
    text: 'Bookmark roles, posts, and candidates, then compare your shortlist before you decide.',
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
