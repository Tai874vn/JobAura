import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, MessagesSquare, Search, Sparkles } from 'lucide-react'
import { Button, ButtonLink } from '@/shared/ui'

const popularSearches = ['Software engineer', 'Data analyst', 'Designer', 'Marketing', 'Internship']

const trustMarkers = [
  { icon: Sparkles, label: 'AI-powered matching' },
  { icon: MessagesSquare, label: 'Real-time chat' },
  { icon: BadgeCheck, label: 'Resume-based levels' },
]

export function LandingHero() {
  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden bg-foreground text-white">
      <Image
        src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=2000&q=85"
        alt="Professionals collaborating around a table"
        fill
        priority
        className="object-cover object-center opacity-50"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/70 to-foreground/80" aria-hidden="true" />
      <div className="container-page relative flex min-h-[70vh] items-center py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-accent">Hiring platform · AI matching</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight sm:text-6xl">
            Find your next role — or the right person for it.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
            Candidates apply to open roles and post their portfolio. Recruiters publish roles and get candidates ranked for each one.
          </p>
          <form action="/hiring-posts" className="mt-8 flex max-w-2xl rounded-lg bg-surface p-2 text-foreground shadow-xl">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
              <Search className="h-5 w-5 shrink-0 text-muted" />
              <input
                name="keyword"
                aria-label="Search roles, skills, or companies"
                className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search roles, skills, or companies"
              />
            </div>
            <Button size="lg" type="submit">
              Search
            </Button>
          </form>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
            <span className="font-bold uppercase tracking-wide text-white/90">Popular:</span>
            {popularSearches.map((term) => (
              <Link
                key={term}
                href={`/hiring-posts?keyword=${encodeURIComponent(term)}`}
                className="rounded transition hover:text-accent"
              >
                {term}
              </Link>
            ))}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/auth/register" variant="accent" size="lg">
              Join JobAura <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              href="/hiring-posts"
              variant="secondary"
              size="lg"
              className="border-white/70 bg-transparent text-white hover:border-white hover:bg-white hover:text-foreground"
            >
              Browse hiring posts
            </ButtonLink>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/85">
            {trustMarkers.map((marker) => (
              <li key={marker.label} className="flex items-center gap-2">
                <marker.icon className="h-4 w-4 text-accent" />
                {marker.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
