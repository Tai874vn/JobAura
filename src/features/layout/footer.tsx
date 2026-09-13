import Link from 'next/link'

const footerColumns = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Find services', href: '/jobs' },
      { label: 'Top-rated services', href: '/jobs?sort=rating_desc' },
      { label: 'Browse categories', href: '/welcome#categories' },
      { label: 'Popular right now', href: '/welcome#services' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Join JobAura', href: '/auth/register' },
      { label: 'Sign in', href: '/auth/login' },
      { label: 'How it works', href: '/welcome#how-it-works' },
      { label: 'FAQ', href: '/welcome#faq' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'About JobAura', href: '/welcome' },
      { label: 'Explore services', href: '/jobs' },
      { label: 'Create account', href: '/auth/register' },
      { label: 'Sign in', href: '/auth/login' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-8 py-10 md:grid-cols-4">
        <div>
          <Link href="/welcome" className="font-display text-2xl font-bold text-primary">
            JobAura
          </Link>
          <p className="mt-3 text-sm text-muted">A focused marketplace for trusted freelance services.</p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-bold">{column.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
