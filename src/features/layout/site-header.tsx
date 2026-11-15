"use client";

import { LogOut, Menu, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { cn } from "@/shared/lib/utils";
import { Avatar, Button } from "@/shared/ui";
import { siteNav } from "./site-nav";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading: isSessionLoading } = useSession();
  const nav = siteNav(user?.role);
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  function submitSearch(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim();
    router.push(keyword ? `${nav.search.target}?keyword=${encodeURIComponent(keyword)}` : nav.search.target);
  }

  function goToLogout() {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/logout");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href={nav.home} className="shrink-0 font-display text-2xl font-bold tracking-tight text-primary">
          JobAura
        </Link>
        <form
          onSubmit={submitSearch}
          role="search"
          className="hidden min-w-0 flex-1 items-center rounded-lg border border-border bg-surface px-3 md:flex"
        >
          <Search className="h-4 w-4 text-muted" aria-hidden="true" />
          <input
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none"
            placeholder={nav.search.placeholder}
            aria-label={nav.search.placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {isSessionLoading ? null : nav.main.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded px-2 py-1 text-sm font-semibold hover:text-foreground",
                isCurrent(link.href) ? "text-primary" : "text-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="ml-auto md:ml-0">
            <NotificationBell />
          </div>
        ) : null}
        {user ? (
          <div className="relative hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              className="interaction relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:ring-offset-2"
              onClick={() => setAccountMenuOpen((value) => !value)}
              aria-label={accountMenuOpen ? "Close account menu" : "Open account menu"}
              aria-controls="account-navigation"
              aria-expanded={accountMenuOpen}
            >
              <Avatar name={user.name} src={user.avatar} className="h-9 w-9" />
            </button>
            {accountMenuOpen ? (
              <div id="account-navigation" className="motion-popover absolute right-0 top-11 w-60 rounded-lg border border-border bg-surface p-2 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                <MenuLink href={`/profile/${user.id}`} label="Profile" icon={<User className="h-4 w-4" />} onClick={() => setAccountMenuOpen(false)} />
                {nav.account.map((link) => (
                  <MenuLink key={link.href} href={link.href} label={link.label} onClick={() => setAccountMenuOpen(false)} />
                ))}
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-danger hover:bg-danger/5"
                  onClick={goToLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="hidden shrink-0 items-center gap-2 md:flex" aria-busy={isSessionLoading}>
            <Button variant="secondary" disabled={isSessionLoading} onClick={() => router.push("/auth/login")}>Sign in</Button>
            <Button disabled={isSessionLoading} onClick={() => router.push("/auth/register")}>Join</Button>
          </div>
        )}

        {!user ? (
          <Button
            className="ml-auto shrink-0 md:hidden"
            variant="secondary"
            size="sm"
            disabled={isSessionLoading}
            aria-busy={isSessionLoading}
            onClick={() => router.push("/auth/login")}
          >
            Sign in
          </Button>
        ) : null}

        <Button
          className="shrink-0 md:hidden"
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {mobileMenuOpen ? (
        <div id="mobile-navigation" className="motion-popover border-t border-border bg-surface p-4 md:hidden">
          <form onSubmit={(event) => { submitSearch(event); setMobileMenuOpen(false); }} role="search" className="mb-3 flex items-center rounded-lg border border-border px-3">
            <Search className="h-4 w-4 text-muted" aria-hidden="true" />
            <input className="h-10 flex-1 bg-transparent px-3 text-sm outline-none" placeholder={nav.search.placeholder}
              aria-label={nav.search.placeholder} value={query} onChange={(event) => setQuery(event.target.value)} />
          </form>
          <div className="grid gap-1 text-sm font-semibold" onClick={() => setMobileMenuOpen(false)}>
            {[...nav.main, ...nav.account.filter((link) => !nav.main.some((main) => main.href === link.href))].map((link) => (
              <Link key={link.href} href={link.href} className="rounded px-2 py-2 hover:bg-surface-muted"
                aria-current={isCurrent(link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
            {isSessionLoading ? null : user ? (
              <>
                <Link href={`/profile/${user.id}`} className="rounded px-2 py-2 hover:bg-surface-muted">Profile</Link>
                <button className="flex items-center gap-2 rounded px-2 py-2 text-left text-danger" onClick={goToLogout}>
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="rounded px-2 py-2 hover:bg-surface-muted">Sign in</Link>
                <Link href="/auth/register" className="rounded px-2 py-2 hover:bg-surface-muted">Create account</Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({ href, icon, label, onClick }: {
  href: string;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      className="interaction flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
      href={href}
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );
}
