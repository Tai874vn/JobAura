'use client'

import { useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { BriefcaseBusiness, Home, LayoutDashboard, LogOut, Menu, Plus, Search, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NotificationBell } from '@/features/notifications/notification-bell'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { canAccessCandidateDirectory } from '@/shared/lib/roles'
import { initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button } from '@/shared/ui'

export function SiteHeader() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, hasHydrated, clearSession, setUser } = useAuthStore()
  const avatarUrl = resolveAssetUrl(user?.avatar)
  const isRecruiter = user?.role === 'employer'
  const homeHref = user ? (isRecruiter ? '/candidates' : '/') : '/welcome'

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: hasHydrated,
    retry: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!hasHydrated) return

    if (meQuery.isSuccess) {
      const verifiedUser = meQuery.data.content ?? null
      if (verifiedUser) setUser(verifiedUser)
      else clearSession()
    }

    if (meQuery.isError) clearSession()
  }, [clearSession, hasHydrated, meQuery.data, meQuery.isError, meQuery.isSuccess, setUser])

  function submitSearch(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const keyword = query.trim()
    const target = isRecruiter ? '/candidates' : '/jobs'
    router.push(keyword ? `${target}?keyword=${encodeURIComponent(keyword)}` : target)
  }

  function goToLogout() {
    setMenuOpen(false)
    router.push('/logout')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href={homeHref} className="font-display text-2xl font-bold tracking-tight text-primary">
          JobAura
        </Link>
        <form onSubmit={submitSearch} className="hidden flex-1 items-center rounded-lg border border-border bg-white px-3 md:flex">
          <Search className="h-4 w-4 text-muted" />
          <input
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none"
            placeholder={isRecruiter ? 'Search candidates, roles, or skills' : 'Search services, skills, or experts'}
            aria-label={isRecruiter ? 'Search candidates, roles, or skills' : 'Search services, skills, or experts'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <nav className="hidden items-center gap-2 md:flex">
          {user && !isRecruiter ? (
            <Link className="flex items-center gap-1.5 px-2 text-sm font-semibold text-muted hover:text-foreground" href="/">
              <Home className="h-4 w-4" /> Home
            </Link>
          ) : null}
          {isRecruiter ? (
            <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/candidates">
              Find Candidates
            </Link>
          ) : null}
          {!isRecruiter ? (
            <>
              <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/jobs">
                Explore
              </Link>
              <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/jobs/new">
                Post a Job
              </Link>
            </>
          ) : null}
          {isRecruiter ? (
            <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/connections">
              Connections
            </Link>
          ) : null}
          {canAccessCandidateDirectory(user?.role) && !isRecruiter ? (
            <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/candidates">
              Find Candidates
            </Link>
          ) : null}
          {user?.role === 'admin' ? (
            <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/admin">
              Admin
            </Link>
          ) : null}
        </nav>
        {!hasHydrated || (meQuery.isPending && !user) ? (
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-10 w-20 rounded-lg bg-surface-muted" />
            <div className="h-10 w-16 rounded-lg bg-surface-muted" />
          </div>
        ) : user ? (
          <div className="hidden items-center gap-2 md:flex">
            <NotificationBell />
            <button
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open account menu"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={user.name} fill unoptimized={shouldBypassImageOptimizer(user.avatar)} className="object-cover" sizes="36px" />
              ) : initials(user.name)}
            </button>
            {menuOpen ? (
              <div className="absolute right-24 top-14 w-56 rounded-lg border border-border bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                <MenuLink href={`/profile/${user.id}`} icon={<User className="h-4 w-4" />} label="Profile" />
                {isRecruiter ? (
                  <>
                    <MenuLink href="/candidates" icon={<Search className="h-4 w-4" />} label="Find candidates" />
                    <MenuLink href="/connections" icon={<LayoutDashboard className="h-4 w-4" />} label="Connections" />
                  </>
                ) : (
                  <>
                    <MenuLink href="/my-posts" icon={<BriefcaseBusiness className="h-4 w-4" />} label="My posts" />
                    <MenuLink href="/my-jobs" icon={<LayoutDashboard className="h-4 w-4" />} label="My jobs" />
                  </>
                )}
                <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/5"
                  onClick={goToLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="secondary" onClick={() => router.push('/auth/login')}>
              Sign in
            </Button>
            <Button onClick={() => router.push('/auth/register')}>Join</Button>
          </div>
        )}
        {user ? <div className="ml-auto md:hidden"><NotificationBell /></div> : null}
        <Button
          className={user ? 'md:hidden' : 'ml-auto md:hidden'}
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {menuOpen ? (
        <div id="mobile-navigation" className="border-t border-border bg-white p-4 md:hidden">
          <div className="grid gap-2 text-sm font-semibold">
            {user && !isRecruiter ? <Link href="/">Home feed</Link> : null}
            {isRecruiter ? <Link href="/candidates">Find Candidates</Link> : null}
            {!isRecruiter ? <Link href="/jobs">Explore</Link> : null}
            {!isRecruiter ? (
              <Link href="/jobs/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Post a Job
              </Link>
            ) : null}
            {isRecruiter ? <Link href="/connections">Connections</Link> : null}
            {canAccessCandidateDirectory(user?.role) && !isRecruiter ? <Link href="/candidates">Find Candidates</Link> : null}
            {!hasHydrated ? null : user ? (
              <>
                <Link href={`/profile/${user.id}`}>Profile</Link>
                <button className="flex items-center gap-2 text-left text-danger" onClick={goToLogout}>
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <Link href="/auth/login">Sign in</Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link className="flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold hover:bg-surface-muted" href={href}>
      {icon}
      {label}
    </Link>
  )
}
