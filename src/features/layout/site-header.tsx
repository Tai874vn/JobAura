'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BriefcaseBusiness, LayoutDashboard, LogOut, Menu, MessageCircle, Plus, Search, Settings, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { initials } from '@/shared/lib/utils'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useChatStore } from '@/shared/stores/chat-store'
import { Button } from '@/shared/ui'

export function SiteHeader() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, hasHydrated, clearSession } = useAuthStore()
  const openChat = useChatStore((state) => state.openChat)

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearSession()
      queryClient.invalidateQueries({ queryKey: queryKeys.me })
      router.push('/auth/login')
    },
  })

  function submitSearch(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push(`/jobs?keyword=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight text-primary">
          JobAura
        </Link>
        <form onSubmit={submitSearch} className="hidden flex-1 items-center rounded-lg border border-border bg-white px-3 md:flex">
          <Search className="h-4 w-4 text-muted" />
          <input
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none"
            placeholder="Search services, skills, or experts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <nav className="hidden items-center gap-2 md:flex">
          <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/jobs">
            Explore
          </Link>
          <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/jobs/new">
            Post a Job
          </Link>
          {user?.role === 'admin' ? (
            <Link className="px-2 text-sm font-semibold text-muted hover:text-foreground" href="/admin">
              Admin
            </Link>
          ) : null}
        </nav>
        {!hasHydrated ? (
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-10 w-20 rounded-lg bg-surface-muted" />
            <div className="h-10 w-16 rounded-lg bg-surface-muted" />
          </div>
        ) : user ? (
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" size="icon" onClick={openChat} title="Open chat">
              <MessageCircle className="h-4 w-4" />
            </Button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
              onClick={() => setMenuOpen((value) => !value)}
              aria-label="Open account menu"
            >
              {initials(user.name)}
            </button>
            {menuOpen ? (
              <div className="absolute right-24 top-14 w-56 rounded-lg border border-border bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                <MenuLink href={`/profile/${user.id}`} icon={<User className="h-4 w-4" />} label="Profile" />
                <MenuLink href="/my-posts" icon={<BriefcaseBusiness className="h-4 w-4" />} label="My posts" />
                <MenuLink href="/my-jobs" icon={<LayoutDashboard className="h-4 w-4" />} label="My jobs" />
                <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/5"
                  onClick={() => logoutMutation.mutate()}
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
        <Button className="ml-auto md:hidden" variant="ghost" size="icon" onClick={() => setMenuOpen((value) => !value)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {menuOpen ? (
        <div className="border-t border-border bg-white p-4 md:hidden">
          <div className="grid gap-2 text-sm font-semibold">
            <Link href="/jobs">Explore</Link>
            <Link href="/jobs/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Post a Job
            </Link>
            {!hasHydrated ? null : user ? <Link href={`/profile/${user.id}`}>Profile</Link> : <Link href="/auth/login">Sign in</Link>}
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
