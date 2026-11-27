/**
 * Static example data for the landing and sign-in shortlist previews.
 * Shows a sample hiring post, ranked candidates, and a score breakdown; none of it comes from the API, and every view labels it as an example.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/jobs/components/home/home-page.tsx
 *   - features/jobs/components/home/shortlist-preview.tsx
 */

export const samplePost = {
  title: 'Backend developer',
  occupation: 'Software developer',
  location: 'Ho Chi Minh City',
  minYears: 3,
  skills: ['Java', 'PostgreSQL'],
  applied: 24,
}

export type SampleCandidate = {
  initials: string
  name: string
  occupation: string
  years: number
  level: 'Junior' | 'Mid' | 'Senior'
  score: number
}

export const sampleCandidates: SampleCandidate[] = [
  { initials: 'MA', name: 'Nguyen Minh Anh', occupation: 'Software developer', years: 5, level: 'Senior', score: 0.91 },
  { initials: 'QB', name: 'Tran Quoc Bao', occupation: 'Software developer', years: 3, level: 'Mid', score: 0.84 },
  { initials: 'TH', name: 'Le Thu Ha', occupation: 'Web developer', years: 4, level: 'Mid', score: 0.77 },
  { initials: 'DL', name: 'Pham Duc Long', occupation: 'Database designer', years: 2, level: 'Junior', score: 0.63 },
]

/** What the top candidate brings against each requirement of the sample post. */
export const sampleBreakdown = [
  {
    factor: 'Occupation',
    required: samplePost.occupation,
    found: 'Software developer, same ESCO occupation',
    met: true,
  },
  {
    factor: 'Years in the occupation',
    required: `${samplePost.minYears}+ years`,
    found: '5 years as Software developer',
    met: true,
  },
  {
    factor: 'Skills in the resume',
    required: samplePost.skills.join(', '),
    found: 'Java, PostgreSQL, Spring Boot',
    met: true,
  },
  {
    factor: 'Level read from the resume',
    required: 'Mid or above',
    found: 'Senior: led a team of four on a payments API',
    met: true,
  },
] as const
