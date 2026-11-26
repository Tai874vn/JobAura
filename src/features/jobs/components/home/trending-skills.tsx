import Link from 'next/link'

// Occupation names follow ESCO, the EU's standard list of jobs that hiring posts are tagged with.
const occupations = [
  'Software developer',
  'Web developer',
  'Data analyst',
  'Database designer',
  'Graphic designer',
  'Marketing manager',
  'Accountant',
  'Sales representative',
]

/** Open roles by occupation; one half of the landing's browse block. */
export function OccupationLinks() {
  return (
    <ul className="flex flex-wrap gap-2">
      {occupations.map((occupation) => (
        <li key={occupation}>
          <Link
            href={`/hiring-posts?keyword=${encodeURIComponent(occupation)}`}
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm text-muted transition-colors hover:border-primary/40 hover:text-primary sm:min-h-9"
          >
            {occupation}
          </Link>
        </li>
      ))}
    </ul>
  )
}
