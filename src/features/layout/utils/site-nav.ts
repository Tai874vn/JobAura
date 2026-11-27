/**
 * Navigation config and active-link helper for the site header. Builds the main links, account menu links, and search target for each role (admin, employer, candidate, and visitor), and checks which link matches the current page.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/layout/components/site-header.tsx
 */

// `wide` links show in the header bar only from 1280px; below that they stay in the account menu.
export type NavLink = { href: string; label: string; wide?: boolean }

export type SiteNav = {
  home: string
  main: NavLink[]
  account: NavLink[]
  search: { target: string; placeholder: string }
}

export function siteNav(role?: string | null): SiteNav {
  // Admins oversee both sides, so they reach every area: the admin pages, both public lists, the recruiter
  // tools in the header, and the candidate tools in the account menu.
  if (role === 'admin') {
    return {
      home: '/',
      main: [
        { href: '/admin', label: 'Admin' },
        { href: '/', label: 'Home', wide: true },
        { href: '/hiring-posts', label: 'Hiring posts' },
        { href: '/my-hiring-posts', label: 'My hiring posts', wide: true },
        { href: '/jobs', label: 'Portfolios' },
        { href: '/candidates', label: 'Find candidates' },
        { href: '/recommendations/candidates', label: 'AI matching' },
        { href: '/connections', label: 'Connections' },
      ],
      account: [
        { href: '/', label: 'Home feed' },
        { href: '/contracts', label: 'Contracts' },
        { href: '/my-hiring-posts', label: 'My hiring posts' },
        { href: '/my-posts', label: 'My portfolio posts' },
        { href: '/saved', label: 'Saved' },
        { href: '/settings', label: 'Settings' },
      ],
      search: { target: '/candidates', placeholder: 'Search candidates by name, role, or skill' },
    }
  }
  if (role === 'employer') {
    return {
      home: '/my-hiring-posts',
      main: [
        { href: '/my-hiring-posts', label: 'My hiring posts' },
        { href: '/candidates', label: 'Find candidates' },
        { href: '/recommendations/candidates', label: 'AI matching' },
        { href: '/contracts', label: 'Contracts' },
        { href: '/connections', label: 'Connections' },
      ],
      account: [
        { href: '/my-hiring-posts', label: 'My hiring posts' },
        { href: '/hiring-posts', label: 'Browse hiring posts' },
        { href: '/settings', label: 'Settings' },
      ],
      search: { target: '/candidates', placeholder: 'Search candidates by name, role, or skill' },
    }
  }
  if (role === 'user') {
    return {
      home: '/',
      main: [
        { href: '/', label: 'Home' },
        { href: '/hiring-posts', label: 'Hiring posts' },
        { href: '/my-applications', label: 'My applications' },
        { href: '/contracts', label: 'Contracts' },
        { href: '/jobs', label: 'Portfolios' },
        { href: '/connections', label: 'Connections' },
      ],
      account: [
        { href: '/my-posts', label: 'My portfolio posts' },
        { href: '/saved', label: 'Saved' },
        { href: '/settings', label: 'Settings' },
      ],
      search: { target: '/hiring-posts', placeholder: 'Search hiring posts by role, skill, or company' },
    }
  }
  return {
    home: '/welcome',
    main: [
      { href: '/hiring-posts', label: 'Hiring posts' },
      { href: '/jobs', label: 'Portfolios' },
    ],
    account: [],
    search: { target: '/hiring-posts', placeholder: 'Search hiring posts by role, skill, or company' },
  }
}

/** True when the page path is this link's page or one of its sub pages. Home ("/") matches only itself. */
function linkMatches(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Whether a header link is the current page. When two links match (on /jobs/new both "/jobs" and "/jobs/new" do),
 * only the longest (most specific) one counts, so the header never underlines two links at once.
 */
export function isCurrentLink(pathname: string, href: string, hrefs: string[]): boolean {
  if (!linkMatches(pathname, href)) return false
  return !hrefs.some((other) => other.length > href.length && linkMatches(pathname, other))
}
