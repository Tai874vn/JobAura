import Link from 'next/link'
import { Section } from '@/shared/ui'

const trendingSkills = [
  'Logo design',
  'Web development',
  'React',
  'Video editing',
  'SEO',
  'Data entry',
  'Illustration',
  'Copywriting',
  'WordPress',
  'Mobile apps',
]

export function TrendingSkills() {
  return (
    <Section id="skills" tone="surface" className="border-b border-border py-10 sm:py-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Trending skills</h2>
        <ul className="flex flex-wrap gap-2">
          {trendingSkills.map((skill) => (
            <li key={skill}>
              <Link
                href={`/jobs?keyword=${encodeURIComponent(skill)}`}
                className="inline-block rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted transition hover:border-primary hover:text-primary"
              >
                {skill}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
