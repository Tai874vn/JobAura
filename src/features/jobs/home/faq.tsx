import { Accordion, Section, SectionHeading, type AccordionItem } from '@/shared/ui'

export const landingFaqs: AccordionItem[] = [
  {
    question: 'Is JobAura free to join?',
    answer:
      'Yes. Creating an account, posting services, and applying to hiring posts are all free. You agree on payment directly for the work you order.',
  },
  {
    question: 'How do I hire someone?',
    answer:
      'Search the marketplace or browse categories, open a service to review the details, ratings, and seller profile, then start the conversation through built-in chat before you commit.',
  },
  {
    question: 'How do I sell my services?',
    answer:
      'Create a candidate account and publish your service with clear pricing and a strong description. It appears in the marketplace, and you can also watch hiring posts and apply with a cover letter.',
  },
  {
    question: 'What is AI matching?',
    answer:
      'JobAura can score candidates against a hiring post automatically. Recruiters get a ranked shortlist without manual searching, and workers get recommended jobs that fit their skills.',
  },
  {
    question: 'Can I chat before hiring?',
    answer:
      'Yes. Connect with a professional and use real-time chat to agree on scope, timeline, and price before any money changes hands.',
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
