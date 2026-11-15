import { Handshake, MessagesSquare, Search } from 'lucide-react'
import { Card, CardContent, Section, SectionHeading } from '@/shared/ui'

const steps = [
  {
    icon: Search,
    step: 'Step 1',
    title: 'Find or post a role',
    text: 'Candidates search open roles by field, level, and location. Recruiters publish a role with the field, years, and skills it needs.',
  },
  {
    icon: MessagesSquare,
    step: 'Step 2',
    title: 'Show your work',
    text: 'Candidates add a resume and portfolio posts; AI reads their level from the resume. Recruiters see it on every profile.',
  },
  {
    icon: Handshake,
    step: 'Step 3',
    title: 'Match & talk',
    text: 'AI ranks roles for each candidate and candidates for each role. Apply in one step, or message each other in real-time chat.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="default">
      <SectionHeading title="How it works" description="From first search to first hire in three simple steps." />
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {steps.map((item) => (
          <Card key={item.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-muted">{item.step}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{item.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}
