/**
 * The header for each role, in order of what that role comes to do:
 * candidates find hiring posts and post a portfolio; recruiters manage their posts and find candidates;
 * visitors browse both before signing up.
 */
export type NavLink = { href: string; label: string }

export type SiteNav = {
  home: string
  main: NavLink[]
  account: NavLink[]
  search: { target: string; placeholder: string }
}

export function siteNav(role?: string | null): SiteNav {
  if (role === 'employer' || role === 'admin') {
    return {
      home: role === 'admin' ? '/admin' : '/my-hiring-posts',
      main: [
        { href: '/my-hiring-posts', label: 'My hiring posts' },
        { href: '/candidates', label: 'Find candidates' },
        { href: '/recommendations/candidates', label: 'AI matching' },
        { href: '/connections', label: 'Connections' },
        ...(role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
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
        { href: '/jobs/new', label: 'Post portfolio' },
        { href: '/connections', label: 'Connections' },
      ],
      account: [
        { href: '/my-posts', label: 'My portfolio posts' },
        { href: '/jobs', label: 'Browse portfolios' },
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
