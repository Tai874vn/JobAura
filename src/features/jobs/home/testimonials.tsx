import { Star } from 'lucide-react'
import { Avatar, Card, CardContent, Section, SectionHeading } from '@/shared/ui'

const testimonials = [
  {
    quote:
      'I needed a logo on a tight deadline. Found a designer the same evening, chatted through the brief, and had three concepts within two days.',
    name: 'Linh Tran',
    role: 'Startup founder',
  },
  {
    quote:
      'The AI matching surfaced candidates I would never have found by searching. Our shortlist was ready in minutes, not days.',
    name: 'Minh Nguyen',
    role: 'Hiring manager',
  },
  {
    quote:
      'Posting my services took minutes. Real-time chat with clients and clear ratings make it easy to build a steady stream of work.',
    name: 'Danh Vo',
    role: 'Freelance developer',
  },
]

export function Testimonials() {
  return (
    <Section tone="default">
      <SectionHeading
        eyebrow="Testimonials"
        title="What people say"
        description="Clients and professionals already working through JobAura."
      />
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <Card key={testimonial.name}>
            <CardContent className="flex h-full flex-col p-6">
              <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} className="h-4 w-4 fill-rating text-rating" />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-6 text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <Avatar name={testimonial.name} size="md" />
                <div>
                  <p className="text-sm font-bold">{testimonial.name}</p>
                  <p className="text-xs text-muted">{testimonial.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}
