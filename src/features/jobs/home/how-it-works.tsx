import { Section, SectionHeading } from '@/shared/ui'

// One sequence for both sides of a hire; the order is the information, so the steps stay numbered.
const steps = [
  {
    title: 'Post or find a role',
    candidate: 'Search open roles by occupation, level, and location.',
    recruiter: 'Publish a role with its occupation, years, and skills.',
  },
  {
    title: 'Let the resume speak',
    candidate: 'Add a resume; your level is read from the work you describe.',
    recruiter: 'See each applicant’s occupation, years, and level.',
  },
  {
    title: 'Match, save, and talk',
    candidate: 'See the roles that fit you and the skills you still need.',
    recruiter: 'Get a ranked shortlist and message candidates in real time.',
  },
]

export function HowItWorks() {
  return (
    <Section id="how-it-works" tone="default">
      <SectionHeading title="How it works" description="The same three steps for candidates and recruiters" />
      <ol className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
        {steps.map((step, index) => (
          <li key={step.title} className="min-w-0 border-t border-foreground/15 pt-5">
            <p className="font-mono text-xs tabular-nums text-muted">Step {index + 1}</p>
            <h3 className="mt-2 font-display text-lg font-medium">{step.title}</h3>
            <dl className="mt-4 grid gap-3 text-sm leading-6">
              <div>
                <dt className="font-medium">Candidates</dt>
                <dd className="text-muted">{step.candidate}</dd>
              </div>
              <div>
                <dt className="font-medium">Recruiters</dt>
                <dd className="text-muted">{step.recruiter}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </Section>
  )
}
