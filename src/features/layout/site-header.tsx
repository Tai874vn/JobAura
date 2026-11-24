"use client";

import { LogOut, Menu, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { PipelineLiveUpdates } from "@/features/hiring-pipeline/use-pipeline-live-updates";
import { ContractLiveUpdates } from "@/features/contracts/use-contract-live-updates";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { WalletChip } from "@/features/wallet/wallet-chip";
import { cn } from "@/shared/lib/utils";
import { Avatar, Button } from "@/shared/ui";
import { siteNav } from "./site-nav";

export function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading: isSessionLoading } = useSession();
  const nav = siteNav(user?.role);
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  function goToLogout() {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/logout");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href={nav.home} className="shrink-0 font-display text-xl font-medium text-primary">
          JobAura
        </Link>
        {/* Every page searches in its own content (hiring posts, candidates, the landing hero), so the header has no
            search box. Links fill the header's height so the current page can carry an underline on its bottom edge. */}
        <nav className="hidden shrink-0 items-stretch gap-2 self-stretch lg:ml-6 lg:flex" aria-label="Main">
          {isSessionLoading ? null : nav.main.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isCurrent(link.href) ? "page" : undefined}
              className={cn(
                "relative flex items-center whitespace-nowrap px-2 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-bright",
                "after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-sm after:bg-primary after:opacity-0 after:transition-opacity",
                link.wide && "hidden xl:flex",
                isCurrent(link.href) ? "text-primary after:opacity-100 hover:text-primary" : "text-muted",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {user ? (
          <div className="ml-auto flex items-center gap-2">
            <PipelineLiveUpdates />
            <ContractLiveUpdates />
            <WalletChip />
            <NotificationBell />
          </div>
        ) : null}
        {user ? (
          <div className="relative hidden shrink-0 items-center gap-2 md:flex">
            <button
              type="button"
              className="interaction relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:ring-offset-2"
              onClick={() => setAccountMenuOpen((value) => !value)}
              aria-label={accountMenuOpen ? "Close account menu" : "Open account menu"}
              aria-controls="account-navigation"
              aria-expanded={accountMenuOpen}
            >
              <Avatar name={user.name} src={user.avatar} className="h-9 w-9" />
            </button>
            {accountMenuOpen ? (
              <div id="account-navigation" className="motion-popover absolute right-0 top-11 w-60 rounded-lg border border-border bg-surface p-2 shadow-float">
                <MenuLink href={`/profile/${user.id}`} label="Profile" icon={<User className="h-4 w-4" />} onClick={() => setAccountMenuOpen(false)} />
                {nav.account.map((link) => (
                  <MenuLink key={link.href} href={link.href} label={link.label} onClick={() => setAccountMenuOpen(false)} />
                ))}
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-danger hover:bg-danger/5"
                  onClick={goToLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="hidden shrink-0 items-center gap-2 md:ml-auto md:flex" aria-busy={isSessionLoading}>
            <Button variant="ghost" className="text-muted hover:text-foreground" disabled={isSessionLoading} onClick={() => router.push("/auth/login")}>Sign in</Button>
            <Button disabled={isSessionLoading} onClick={() => router.push("/auth/register")}>Join</Button>
          </div>
        )}

        {!user ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 md:hidden" aria-busy={isSessionLoading}>
            <Button variant="ghost" size="sm" disabled={isSessionLoading} onClick={() => router.push("/auth/login")}>
              Sign in
            </Button>
            <Button size="sm" disabled={isSessionLoading} onClick={() => router.push("/auth/register")}>
              Join
            </Button>
          </div>
        ) : null}

        <Button
          className="shrink-0 lg:hidden"
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
        <div id="mobile-navigation" className="motion-popover border-t border-border bg-surface p-4 lg:hidden">
          <div className="grid gap-1 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
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
      className="interaction flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
      href={href}
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );
}
