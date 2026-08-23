"use client";

import Image from "next/image";
import {
  BriefcaseBusiness,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { NotificationBell } from "@/features/notifications/notification-bell";
import {
  canAccessCandidateDirectory,
  canAccessEmployeeTools,
} from "@/shared/lib/roles";
import {
  initials,
  resolveAssetUrl,
  shouldBypassImageOptimizer,
} from "@/shared/lib/utils";
import { Button } from "@/shared/ui";

export function SiteHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading: isSessionLoading } = useSession();
  const avatarUrl = resolveAssetUrl(user?.avatar);
  const isRecruiter = user?.role === "employer";
  const canUseRecruiterTools = canAccessCandidateDirectory(user?.role);
  const canUseEmployeeTools = canAccessEmployeeTools(user?.role);
  const homeHref = user
    ? user.role === "admin"
      ? "/admin"
      : isRecruiter
        ? "/candidates"
        : "/"
    : "/welcome";
  function submitSearch(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = query.trim();
    const target = isRecruiter ? "/candidates" : "/jobs";
    router.push(
      keyword ? `${target}?keyword=${encodeURIComponent(keyword)}` : target,
    );
  }

  function goToLogout() {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/logout");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link
          href={homeHref}
          className="font-display text-2xl font-bold tracking-tight text-primary"
        >
          JobAura
        </Link>
        <form
          onSubmit={submitSearch}
          className="hidden flex-1 items-center rounded-lg border border-border bg-white px-3 md:flex"
        >
          <Search className="h-4 w-4 text-muted" />
          <input
            className="h-10 flex-1 bg-transparent px-3 text-sm outline-none"
            placeholder={
              isRecruiter
                ? "Search candidates, roles, or skills"
                : "Search services, skills, or experts"
            }
            aria-label={
              isRecruiter
                ? "Search candidates, roles, or skills"
                : "Search services, skills, or experts"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <nav className="hidden items-center gap-2 md:flex">
          {user && canUseEmployeeTools ? (
            <Link
              className="flex items-center gap-1.5 px-2 text-sm font-semibold text-muted hover:text-foreground"
              href="/"
            >
              <Home className="h-4 w-4" /> Home
            </Link>
          ) : null}
          {canUseEmployeeTools ? (
            <>
              <Link
                className="px-2 text-sm font-semibold text-muted hover:text-foreground"
                href="/jobs"
              >
                Explore
              </Link>
              <Link
                className="px-2 text-sm font-semibold text-muted hover:text-foreground"
                href="/jobs/new"
              >
                Post Service
              </Link>
            </>
          ) : null}
          {canUseRecruiterTools ? (
            <>
              <Link
                className="px-2 text-sm font-semibold text-muted hover:text-foreground"
                href="/candidates"
              >
                Find Candidates
              </Link>
              <Link
                className="px-2 text-sm font-semibold text-muted hover:text-foreground"
                href="/recommendations/candidates"
              >
                AI Matching
              </Link>
            </>
          ) : null}
          {user ? (
            <>
              <Link
                className="px-2 text-sm font-semibold text-muted hover:text-foreground"
                href="/hiring-posts"
              >
                Hiring Posts
              </Link>
              <Link
                className="px-2 text-sm font-semibold text-muted hover:text-foreground"
                href="/connections"
              >
                Connections
              </Link>
            </>
          ) : null}
          {user?.role === "admin" ? (
            <Link
              className="px-2 text-sm font-semibold text-muted hover:text-foreground"
              href="/admin"
            >
              Admin
            </Link>
          ) : null}
        </nav>
        {user ? (
          <div className="ml-auto md:ml-0">
            <NotificationBell />
          </div>
        ) : null}
        {isSessionLoading ? (
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-10 w-20 rounded-lg bg-surface-muted" />
            <div className="h-10 w-16 rounded-lg bg-surface-muted" />
          </div>
        ) : user ? (
          <div className="relative hidden items-center gap-2 md:flex">
            <button
              type="button"
              className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white"
              onClick={() => setAccountMenuOpen((value) => !value)}
              aria-label={accountMenuOpen ? "Close account menu" : "Open account menu"}
              aria-controls="account-navigation"
              aria-expanded={accountMenuOpen}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={user.name}
                  fill
                  unoptimized={shouldBypassImageOptimizer(user.avatar)}
                  className="object-cover"
                  sizes="36px"
                />
              ) : (
                initials(user.name)
              )}
            </button>
            {accountMenuOpen ? (
              <div id="account-navigation" className="absolute right-0 top-11 w-56 rounded-lg border border-border bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
                <MenuLink
                  href={`/profile/${user.id}`}
                  icon={<User className="h-4 w-4" />}
                  label="Profile"
                  onClick={() => setAccountMenuOpen(false)}
                />
                {canUseEmployeeTools ? (
                  <>
                    <MenuLink
                      href="/my-posts"
                      icon={<BriefcaseBusiness className="h-4 w-4" />}
                      label="My posts"
                      onClick={() => setAccountMenuOpen(false)}
                    />
                    <MenuLink
                      href="/my-jobs"
                      icon={<LayoutDashboard className="h-4 w-4" />}
                      label="My jobs"
                      onClick={() => setAccountMenuOpen(false)}
                    />
                  </>
                ) : null}
                {canUseRecruiterTools ? (
                  <>
                    <MenuLink
                      href="/candidates"
                      icon={<Search className="h-4 w-4" />}
                      label="Find candidates"
                      onClick={() => setAccountMenuOpen(false)}
                    />
                    <MenuLink
                      href="/recommendations/candidates"
                      icon={<Sparkles className="h-4 w-4" />}
                      label="AI matching"
                      onClick={() => setAccountMenuOpen(false)}
                    />
                  </>
                ) : null}
                <MenuLink
                  href="/hiring-posts"
                  icon={<BriefcaseBusiness className="h-4 w-4" />}
                  label="Hiring posts"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <MenuLink
                  href="/connections"
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  label="Connections"
                  onClick={() => setAccountMenuOpen(false)}
                />
                <MenuLink
                  href="/settings"
                  icon={<Settings className="h-4 w-4" />}
                  label="Settings"
                  onClick={() => setAccountMenuOpen(false)}
                />
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
            <Button
              variant="secondary"
              onClick={() => router.push("/auth/login")}
            >
              Sign in
            </Button>
            <Button onClick={() => router.push("/auth/register")}>Join</Button>
          </div>
        )}
        <Button
          className={user ? "md:hidden" : "ml-auto md:hidden"}
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-controls="mobile-navigation"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {mobileMenuOpen ? (
        <div
          id="mobile-navigation"
          className="border-t border-border bg-white p-4 md:hidden"
        >
          <div className="grid gap-2 text-sm font-semibold" onClick={() => setMobileMenuOpen(false)}>
            {user && canUseEmployeeTools ? <Link href="/">Home feed</Link> : null}
            {canUseEmployeeTools ? <Link href="/jobs">Explore</Link> : null}
            {canUseEmployeeTools ? (
              <Link href="/jobs/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" /> Post Service
              </Link>
            ) : null}
            {canUseRecruiterTools ? (
              <Link href="/candidates">Find Candidates</Link>
            ) : null}
            {canUseRecruiterTools ? (
              <Link href="/recommendations/candidates">AI Matching</Link>
            ) : null}
            {user ? (
              <Link href="/hiring-posts">Hiring Posts</Link>
            ) : null}
            {user ? <Link href="/connections">Connections</Link> : null}
            {user?.role === "admin" ? <Link href="/admin">Admin</Link> : null}
            {isSessionLoading ? null : user ? (
              <>
                <Link href={`/profile/${user.id}`}>Profile</Link>
                <button
                  className="flex items-center gap-2 text-left text-danger"
                  onClick={goToLogout}
                >
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
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      className="flex items-center gap-2 rounded px-3 py-2 text-sm font-semibold hover:bg-surface-muted"
      href={href}
      onClick={onClick}
    >
      {icon}
      {label}
    </Link>
  );
}
