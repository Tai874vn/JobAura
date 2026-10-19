'use client'

import dynamic from 'next/dynamic'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useSession } from '@/features/auth/use-session'
import { Button } from '@/shared/ui'
import { isSettingSection, SettingsPlaceholder, type SettingSection } from './settings/setting-sections'
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
  const activeSection = isSettingSection(requestedSection) ? requestedSection : 'overview'
  const [visited, setVisited] = useState<SettingSection[]>([activeSection])
  // Remember direct links and browser history changes as well as clicks. A
  // previously opened editor stays mounted, so changing section keeps its draft.
  if (!visited.includes(activeSection)) setVisited([...visited, activeSection])

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
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">Manage how you show up, share your experience, and get matched with opportunities.</p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-8">
        <SettingsNavigation active={activeSection} hrefFor={hrefFor} onSelect={selectSection} />
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
