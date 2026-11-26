import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CandidateProfile } from '@/shared/schemas'
import { CandidateResultCard } from './candidate-result-card'

const sampleCandidate = (overrides: Partial<CandidateProfile> = {}): CandidateProfile => ({
  id: 10,
  name: 'Lina Tran',
  avatar: null,
  headline: 'Full-stack TypeScript engineer',
  bio: 'Builds fast web applications and clean APIs for growing teams.',
  location: 'Ho Chi Minh City',
  profileSkills: [
    { id: 1, name: 'TypeScript', level: 'advanced' },
    { id: 2, name: 'React', level: 'advanced' },
    { id: 3, name: 'Next.js', level: 'advanced' },
    { id: 4, name: 'Node.js', level: 'intermediate' },
    { id: 5, name: 'PostgreSQL', level: 'intermediate' },
    { id: 6, name: 'Docker', level: 'beginner' },
  ],
  stats: {
    portfolioItems: 2,
    listedServices: 1,
    certifications: 1,
    completedWork: 4,
    rating: 4.8,
  },
  career: {
    occupationCode: '2513.5',
    occupationTitle: 'web developer',
    specialty: 'Full Stack Developer',
    level: 'Mid',
    yearsInOccupation: 3,
    relatedYears: 0.3,
    legacyField: null,
  },
  education: {
    degree: 'Bachelor',
    fieldOfStudy: '0613',
  },
  profileStrength: 86,
  match: {
    score: 0.86,
    label: 'high_match',
    keywordScore: 1,
    skillScore: 1,
    locationScore: 1,
    qualityScore: 0.86,
  },
  ...overrides,
})

function plainText(fragment: string): string {
  return fragment
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function headingLink(html: string, id: string) {
  const match = html.match(new RegExp(`<h2[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/h2>`))
  if (!match) return null
  const link = match[1].match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
  return link ? { href: link[1], text: plainText(link[2]) } : null
}

function allLinks(html: string) {
  return Array.from(html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g), (match) => ({
    href: match[1].match(/href="([^"]+)"/)?.[1] ?? '',
    text: plainText(match[2]),
  }))
}

function allButtons(html: string) {
  return Array.from(html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g), (match) => plainText(match[1]))
}

function skillListItems(html: string) {
  const list = html.match(/<ul[^>]*aria-label="Skills"[^>]*>([\s\S]*?)<\/ul>/)
  if (!list) return []
  return Array.from(list[1].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g), (match) => plainText(match[1]))
}

function levelBadgeText(html: string) {
  const match = html.match(/<span[^>]*title="Level read by AI from the resume"[^>]*>([\s\S]*?)<\/span>/)
  return match ? plainText(match[1]) : null
}

function allSpans(html: string) {
  const withoutHidden = html.replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, '')
  return Array.from(withoutHidden.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g), (match) => plainText(match[1]))
}

function factsRowItems(html: string) {
  const row = html.match(/<div[^>]*gap-x-\[18px\][^>]*>([\s\S]*?)<\/div>/)
  if (!row) return []
  return allSpans(row[1])
}

function allParagraphs(html: string) {
  return Array.from(html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g), (match) => plainText(match[1]))
}

describe('CandidateResultCard', () => {
  it('renders resume facts, AI level, top 5 skills, degree and actions for a candidate with a resume', () => {
    const html = renderToStaticMarkup(
      <CandidateResultCard
        candidate={sampleCandidate()}
        viewer={{ id: 99, role: 'employer' }}
        connectAction={<button type="button">Connect</button>}
      />,
    )

    expect(headingLink(html, 'candidate-10-name')).toEqual({
      href: '/profile/10',
      text: 'Lina Tran',
    })
    expect(levelBadgeText(html)).toBe('Mid')
    expect(allSpans(html)).toContain('Web developer')
    expect(allSpans(html)).toContain('Full Stack Developer')
    expect(factsRowItems(html)).toEqual([
      '3 yr as Web developer',
      '+0.3 yr related',
      'Ho Chi Minh City',
    ])
    expect(allParagraphs(html)).toContain('Bachelor')
    // Shows the top 5 skills in the Skills list and collapses the 6th into "+1 more".
    expect(skillListItems(html)).toEqual([
      'TypeScript',
      'React',
      'Next.js',
      'Node.js',
      'PostgreSQL',
      '+1 more',
    ])
    expect(allLinks(html)).toContainEqual({ href: '/profile/10', text: 'View profile' })
    expect(allButtons(html)).toEqual(['Message', 'Connect'])
  })

  it('shows a plain "No resume yet" line instead of empty facts for a candidate without a resume', () => {
    const html = renderToStaticMarkup(
      <CandidateResultCard
        candidate={sampleCandidate({
          // Include words like "Mid" and "Bachelor" in headline/bio to make sure we assert elements, not substrings.
          headline: 'Midtown studio designer',
          bio: 'Connect with me for Bachelor-level design mentoring.',
          career: null,
          education: null,
          location: null,
          profileSkills: [],
        })}
        viewer={{ id: 99, role: 'employer' }}
        connectAction={<button type="button">Connect</button>}
      />,
    )

    expect(headingLink(html, 'candidate-10-name')).toEqual({
      href: '/profile/10',
      text: 'Lina Tran',
    })
    expect(factsRowItems(html)).toEqual(['No resume yet'])
    expect(levelBadgeText(html)).toBeNull()
    expect(allSpans(html)).not.toContain('Web developer')
    expect(allParagraphs(html)).not.toContain('Bachelor')
    expect(skillListItems(html)).toEqual([])
    expect(allLinks(html)).toContainEqual({ href: '/profile/10', text: 'View profile' })
    expect(allButtons(html)).toEqual(['Message', 'Connect'])
  })

  it('shows the legacy occupation notice for a resume saved before occupations', () => {
    const html = renderToStaticMarkup(
      <CandidateResultCard
        candidate={sampleCandidate({
          career: {
            occupationCode: null,
            occupationTitle: null,
            specialty: null,
            level: null,
            yearsInOccupation: null,
            relatedYears: null,
            legacyField: 'Data',
          },
          location: 'Hanoi',
        })}
        viewer={{ id: 99, role: 'employer' }}
        connectAction={<button type="button">Connect</button>}
      />,
    )

    expect(allParagraphs(html)).toContain('Previously: Data · no occupation chosen yet')
    expect(factsRowItems(html)).toEqual(['Hanoi'])
    expect(levelBadgeText(html)).toBeNull()
  })

  it('hides Message and Connect buttons when viewing your own card or when signed out', () => {
    const candidate = sampleCandidate({
      bio: 'Message me to Connect about backend roles.',
    })

    const selfHtml = renderToStaticMarkup(
      <CandidateResultCard
        candidate={candidate}
        viewer={{ id: 10, role: 'admin' }}
        connectAction={<button type="button">Connect</button>}
      />,
    )
    expect(allLinks(selfHtml)).toContainEqual({ href: '/profile/10', text: 'View profile' })
    expect(allButtons(selfHtml)).toEqual([])

    const guestHtml = renderToStaticMarkup(
      <CandidateResultCard
        candidate={candidate}
        viewer={null}
        connectAction={<button type="button">Connect</button>}
      />,
    )
    expect(allLinks(guestHtml)).toContainEqual({ href: '/profile/10', text: 'View profile' })
    expect(allButtons(guestHtml)).toEqual([])
  })
})
