export type CandidateLevel = 'junior' | 'mid' | 'senior' | 'lead'
export type CandidateAvailability = 'available' | 'open_soon' | 'busy'

export type CandidateProfile = {
  id: number
  name: string
  headline: string
  location: string
  level: CandidateLevel
  availability: CandidateAvailability
  responseTime: string
  completedWork: number
  certifications: number
  portfolioItems: number
  rating: number
  skills: string[]
  summary: string
  reason: string
}

export type CandidateFilters = {
  keyword?: string
  skill?: string
  location?: string
  level?: CandidateLevel | 'all'
  availableOnly?: boolean
}

export const demoCandidates: CandidateProfile[] = [
  {
    id: 41,
    name: 'Lina Tran',
    headline: 'Senior Backend Engineer',
    location: 'Remote',
    level: 'senior',
    availability: 'available',
    responseTime: '1h response',
    completedWork: 38,
    certifications: 3,
    portfolioItems: 7,
    rating: 4.9,
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    summary: 'Builds production API platforms, async workers, and data-backed services for marketplace teams.',
    reason: 'Strong fit for API, FastAPI, backend systems, and production database work.',
  },
  {
    id: 42,
    name: 'Marcus Reed',
    headline: 'Product Designer',
    location: 'New York',
    level: 'mid',
    availability: 'open_soon',
    responseTime: '3h response',
    completedWork: 24,
    certifications: 1,
    portfolioItems: 12,
    rating: 4.8,
    skills: ['Figma', 'Design Systems', 'UX Research', 'Prototyping'],
    summary: 'Designs marketplace workflows, design systems, and high-conversion product experiences.',
    reason: 'Best for UI systems, product discovery, and prototype-heavy product work.',
  },
  {
    id: 43,
    name: 'Aisha Khan',
    headline: 'Frontend Developer',
    location: 'Remote',
    level: 'mid',
    availability: 'available',
    responseTime: '2h response',
    completedWork: 31,
    certifications: 2,
    portfolioItems: 9,
    rating: 4.7,
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    summary: 'Ships polished React and Next.js interfaces with strong accessibility and performance habits.',
    reason: 'Strong match for frontend implementation, TypeScript, and component systems.',
  },
  {
    id: 44,
    name: 'Diego Santos',
    headline: 'Cloud DevOps Lead',
    location: 'Austin',
    level: 'lead',
    availability: 'busy',
    responseTime: '1d response',
    completedWork: 46,
    certifications: 5,
    portfolioItems: 5,
    rating: 5,
    skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD'],
    summary: 'Leads cloud migrations, deployment pipelines, and production reliability programs.',
    reason: 'Best for infrastructure, deployment automation, and platform reliability.',
  },
  {
    id: 45,
    name: 'Mei Chen',
    headline: 'Data Analyst',
    location: 'Singapore',
    level: 'junior',
    availability: 'available',
    responseTime: '4h response',
    completedWork: 15,
    certifications: 2,
    portfolioItems: 4,
    rating: 4.6,
    skills: ['SQL', 'Power BI', 'Python', 'Analytics'],
    summary: 'Turns operational data into reports, dashboards, and decision-ready insights.',
    reason: 'Useful for reporting, analytics, SQL cleanup, and dashboard delivery.',
  },
]

export const candidateSkillOptions = ['FastAPI', 'React', 'Design Systems', 'AWS', 'SQL'] as const
export const candidateLocationOptions = ['Remote', 'New York', 'Austin', 'Singapore'] as const

export function filterCandidates(candidates: CandidateProfile[], filters: CandidateFilters) {
  const keyword = normalize(filters.keyword)
  const skill = normalize(filters.skill)
  const location = normalize(filters.location)

  return candidates.filter((candidate) => {
    const searchable = normalize([
      candidate.name,
      candidate.headline,
      candidate.summary,
      candidate.reason,
      ...candidate.skills,
    ].join(' '))
    const skills = candidate.skills.map(normalize)

    if (keyword && !searchable.includes(keyword)) return false
    if (skill && !skills.includes(skill)) return false
    if (location && normalize(candidate.location) !== location) return false
    if (filters.level && filters.level !== 'all' && candidate.level !== filters.level) return false
    if (filters.availableOnly && candidate.availability !== 'available') return false

    return true
  })
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}
