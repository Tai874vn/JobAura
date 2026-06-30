import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-4">
        <div>
          <Link href="/welcome" className="font-display text-2xl font-bold text-primary">
            JobAura
          </Link>
          <p className="mt-3 text-sm text-muted">A focused marketplace for trusted freelance services.</p>
        </div>
        {[
          ['For clients', 'Find services', 'Hire experts', 'Manage orders'],
          ['For sellers', 'Post services', 'Build profile', 'Chat with buyers'],
          ['Platform', 'Admin', 'Settings', 'Support'],
        ].map(([title, ...items]) => (
          <div key={title}>
            <h3 className="text-sm font-bold">{title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
