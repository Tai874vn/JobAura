/**
 * Frequently asked questions section for the public landing page (/welcome).
 * Exports the static Q&A list and renders it inside an accordion.
 *
 * Calls: Accordion; Section; SectionHeading
 * Used by:
 *   - app/(marketplace)/welcome/page.tsx
 *   - features/jobs/components/home/home-page.tsx
 */

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
      'Create a recruiter account and publish a hiring post with the occupation (from ESCO, the EU’s standard list of jobs), required years, and skills. Candidates apply to it, and AI matching ranks candidates for it. You can also search the candidate directory.',
  },
  {
    question: 'How do I find a job?',
    answer:
      'Create a candidate account, add your resume, and apply to hiring posts. Post your portfolio so recruiters can find you, and run AI matching to see the roles that fit you best.',
  },
  {
    question: 'What is AI matching?',
    answer:
      'JobAura compares each candidate with a hiring post on four points: the occupation, years in it, the skills in the resume, and the level read from the work described. Recruiters get a ranked shortlist with matched and missing skills, and candidates get the open roles that fit their resume.',
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
          description="For candidates and recruiters"
          className="flex-col items-center text-center"
        />
        <Accordion items={landingFaqs} className="mt-8" />
      </div>
    </Section>
  )
}
