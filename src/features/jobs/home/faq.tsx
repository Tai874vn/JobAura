import { Accordion, Section, SectionHeading, type AccordionItem } from '@/shared/ui'

export const landingFaqs: AccordionItem[] = [
  {
    question: 'Is JobAura free to join?',
    answer:
      'Yes. Creating an account, applying to roles, posting your portfolio, and publishing hiring posts are all free.',
  },
  {
    question: 'How do I hire someone?',
    answer:
      'Create a recruiter account and publish a hiring post with the field, required years, and skills. Candidates apply to it, and AI matching ranks candidates for it. You can also search the candidate directory.',
  },
  {
    question: 'How do I find a job?',
    answer:
      'Create a candidate account, add your resume, and apply to hiring posts. Post your portfolio so recruiters can find you, and run AI matching to see the roles that fit you best.',
  },
  {
    question: 'What is AI matching?',
    answer:
      'JobAura scores candidates against a hiring post automatically. Recruiters get a ranked shortlist, and candidates get the open roles that fit their resume.',
  },
  {
    question: 'Can I chat before hiring?',
    answer:
      'Yes. Connect with a recruiter or candidate and use real-time chat to talk about a role before applying or hiring.',
  },
]

export function FaqSection() {
  return (
    <Section id="faq" tone="surface">
      <div className="mx-auto max-w-3xl">
        <SectionHeading
          title="Frequently asked questions"
          description="Everything you need to know before your first hire."
          className="flex-col items-center text-center"
        />
        <Accordion items={landingFaqs} className="mt-7" />
      </div>
    </Section>
  )
}
