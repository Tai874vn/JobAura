'use client'

/**
 * Main layout and tab switcher for the /settings page.
 * Reads ?section= and ?focus= from the URL, keeps visited editors mounted to preserve drafts, and renders the sidebar navigation and active panel.
 *
 * Calls: GET /api/users/me/resume; useSession; useProfileStrength; settingsResumeOptions; ProfileSettingsEditor; ResumeSettingsEditor; SettingsOverview; SettingsPlaceholder
 * Used by:
 *   - app/(workspace)/settings/page.tsx
 */

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/features/auth/hooks/use-session'
import { scrollBehavior } from '@/shared/lib/motion'
import { Button } from '@/shared/ui'
import { hasResumeSection, isSettingSection, SettingsPlaceholder, type SettingSection, settingSections, SettingsOverview } from './setting-sections'
import { SettingsLoading, SettingsPanelSkeleton } from './settings-loading'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { useProfileStrength } from '@/features/users/utils/profile-strength'
import type { UserProfile } from '@/shared/schemas'
import { settingsResumeOptions } from '@/features/workspace/utils/settings/settings-resume-query'

const ProfileSettingsEditor = dynamic(() => import('./profile-settings-editor').then((mod) => mod.ProfileSettingsEditor), {
  loading: () => <SettingsPanelSkeleton />,
})
const ResumeSettingsEditor = dynamic(() => import('./resume-settings-editor').then((mod) => mod.ResumeSettingsEditor), {
  loading: () => <SettingsPanelSkeleton />,
})

/**
 * /settings. ?section= picks the editor (overview, profile, resume, ...); resume only for roles that have one.
 * An editor stays mounted after you leave it (visited), so a half-typed draft is kept when you switch sections.
 * ?focus=<field> (from the profile-strength list) scrolls to that field, focuses it and flashes a ring once.
 */
export function SettingsPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user: profile, isLoading } = useSession()
  const requestedSection = searchParams.get('section')
  const showResume = hasResumeSection(profile?.role)
  const activeSection = isSettingSection(requestedSection) && (showResume || requestedSection !== 'resume')
    ? requestedSection
    : 'overview'
  const [visited, setVisited] = useState<SettingSection[]>([activeSection])
  // Remember direct links and browser history changes as well as clicks. A
  // previously opened editor stays mounted, so changing section keeps its draft.
  if (!visited.includes(activeSection)) setVisited([...visited, activeSection])

  // Profile strength links name a field (`?focus=headline`): scroll to it once its editor has loaded, focus it,
  // flash a ring, then drop `focus` from the URL so switching sections does not jump again.
  const focus = searchParams.get('focus')
  useEffect(() => {
    if (!focus) return
    let tries = 0
    const timer = window.setInterval(() => {
      const target = [...document.querySelectorAll<HTMLElement>('[data-focus]')]
        .find((element) => element.dataset.focus === focus && element.offsetParent !== null)
      if (!target && ++tries < 60) return
      window.clearInterval(timer)
      const params = new URLSearchParams(window.location.search)
      params.delete('focus')
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
      if (!target) return
      target.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
      target.querySelector<HTMLElement>('input:not([type=file]), textarea, select, button')?.focus({ preventScroll: true })
      const ring = ['ring-2', 'ring-primary', 'ring-offset-4', 'rounded-lg']
      target.classList.add(...ring)
      window.setTimeout(() => target.classList.remove(...ring), 1800)
    }, 50)
    return () => window.clearInterval(timer)
  }, [focus, activeSection])

  function hrefFor(section: SettingSection) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', section)
    return `${pathname}?${params.toString()}`
  }
  function selectSection(section: SettingSection) {
    if (section === activeSection) return
    // This is client-only UI state, not a new server-rendered route. Next.js
    // syncs native history changes with useSearchParams without an RSC fetch.
    window.history.replaceState(null, '', hrefFor(section) + window.location.hash)
  }

  if (isLoading) return <SettingsLoading />
  if (!profile) return <div className="container-page py-8 text-sm text-muted">Unable to load your editable profile.</div>

  return (
    <div className="container-page py-8 sm:py-10">
      <header className="mb-7 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Settings</h1>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
        <SettingsNavigation active={activeSection} hrefFor={hrefFor} onSelect={selectSection} showResume={showResume} />
        <div className="min-w-0">
          {activeSection === 'overview' ? <div className="results-in"><SettingsOverviewPanel profile={profile} onSelect={selectSection} /></div> : null}
          {visited.includes('profile') ? <section hidden={activeSection !== 'profile'} aria-label="Profile settings">
            <ProfileSettingsEditor key={profile.id} profile={profile} active={activeSection === 'profile'} onBlockedNavigation={() => selectSection('profile')} />
          </section> : null}
          {visited.includes('resume') ? <section hidden={activeSection !== 'resume'} aria-label="Resume settings">
            <ResumeSettingsEditor key={profile.id} active={activeSection === 'resume'} onBlockedNavigation={() => selectSection('resume')} />
          </section> : null}
          {!['overview', 'profile', 'resume'].includes(activeSection) ? <div className="results-in space-y-4">
            <SettingsPlaceholder section={activeSection} />
            <Button variant="secondary" onClick={() => selectSection('overview')}>Back to overview</Button>
          </div> : null}
        </div>
      </div>
    </div>
  )
}

export function SettingsNavigation({ active, hrefFor, onSelect, showResume = true }: {
  active: SettingSection
  showResume?: boolean
  hrefFor: (section: SettingSection) => string
  onSelect: (section: SettingSection) => void
}) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <nav aria-label="Settings sections" className="flex gap-2 rounded-xl border border-border bg-surface p-2 lg:flex-col">
        {settingSections.slice(0, 3).filter((section) => showResume || section.id !== 'resume').map((section) => (
          <a key={section.id} href={hrefFor(section.id)} aria-current={active === section.id ? 'page' : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onSelect(section.id)
            }}
            className={cn('interaction group flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright lg:justify-start lg:px-3',
              active === section.id ? 'bg-surface-muted text-foreground' : 'text-muted hover:bg-surface-muted hover:text-foreground')}>
            <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{section.icon}</span>
            <span className="min-w-0">
              <span className="block">{section.title}</span>
              <span className="mt-0.5 hidden text-xs font-normal text-muted lg:block">{section.description}</span>
            </span>
            <ChevronRight className="ml-auto hidden h-4 w-4 shrink-0 lg:block" aria-hidden="true" />
          </a>
        ))}
      </nav>
      <details className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted">
        <summary className="cursor-pointer rounded font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">Coming soon</summary>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-1">
          {settingSections.slice(3).map((section) => <li key={section.id} className="flex items-center gap-2"><span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{section.icon}</span>{section.title}</li>)}
        </ul>
      </details>
    </aside>
  )
}

export function SettingsOverviewPanel({ profile, onSelect }: {
  profile: UserProfile
  onSelect: (section: SettingSection) => void
}) {
  const strength = useProfileStrength(profile)
  // Data: settingsResumeOptions() → usersApi.myResume → GET /api/users/me/resume → NestjsBE/src/modules/users/services/user-resume.service.ts getMyResume()
  const resumeQuery = useQuery(settingsResumeOptions(hasResumeSection(profile.role), profile.id))
  return <SettingsOverview profile={profile} completion={strength.score} missing={strength.missing}
    resume={resumeQuery.data?.content ?? null} resumeLoading={resumeQuery.isLoading}
    resumeError={resumeQuery.isError} resumeRetrying={resumeQuery.isFetching}
    onRetryResume={() => void resumeQuery.refetch()} onSelect={onSelect} />
}
