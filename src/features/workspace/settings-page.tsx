'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from '@/features/auth/use-session'
import { Button } from '@/shared/ui'
import { hasResumeSection, isSettingSection, SettingsPlaceholder, type SettingSection } from './settings/setting-sections'
import { SettingsLoading, SettingsPanelSkeleton } from './settings/settings-loading'
import { SettingsNavigation } from './settings/settings-navigation'
import { SettingsOverviewPanel } from './settings/settings-overview-panel'

const ProfileSettingsEditor = dynamic(() => import('./settings/profile-settings-editor').then((mod) => mod.ProfileSettingsEditor), {
  loading: () => <SettingsPanelSkeleton />,
})
const ResumeSettingsEditor = dynamic(() => import('./settings/resume-settings-editor').then((mod) => mod.ResumeSettingsEditor), {
  loading: () => <SettingsPanelSkeleton />,
})

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
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          {activeSection === 'overview' ? <SettingsOverviewPanel profile={profile} onSelect={selectSection} /> : null}
          {visited.includes('profile') ? <section hidden={activeSection !== 'profile'} aria-label="Profile settings">
            <ProfileSettingsEditor key={profile.id} profile={profile} />
          </section> : null}
          {visited.includes('resume') ? <section hidden={activeSection !== 'resume'} aria-label="Resume settings">
            <ResumeSettingsEditor key={profile.id} active={activeSection === 'resume'} />
          </section> : null}
          {!['overview', 'profile', 'resume'].includes(activeSection) ? <div className="space-y-4">
            <SettingsPlaceholder section={activeSection} />
            <Button variant="secondary" onClick={() => selectSection('overview')}>Back to overview</Button>
          </div> : null}
        </div>
      </div>
    </div>
  )
}
