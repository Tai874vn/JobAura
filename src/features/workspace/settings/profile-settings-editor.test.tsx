import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { UserProfile } from '@/shared/schemas'
import { ProfileSettingsEditor } from './profile-settings-editor'

describe('Profile settings editor initialization', () => {
  it('shows cached profile fields on first render without waiting for an effect', () => {
    const client = new QueryClient()
    const profile: UserProfile = {
      id: 6, name: 'Ava', email: 'ava@example.com', role: 'user', headline: 'Engineer', bio: 'Builds apps',
      candidateDiscoverable: true,
      skills: [{ name: 'TypeScript', level: 'advanced' }],
      certifications: [{ name: 'AWS', issuedAt: '2026-01-02T00:00:00Z' }],
      portfolioItems: [{ id: 1, title: 'JobAura' }],
    }
    const html = renderToStaticMarkup(<QueryClientProvider client={client}><ProfileSettingsEditor profile={profile} /></QueryClientProvider>)
    expect(html).toContain('value="Ava"')
    expect(html).toContain('value="Engineer"')
    expect(html).toContain('Builds apps</textarea>')
    expect(html).toContain('value="TypeScript"')
    expect(html).toContain('value="2026-01-02"')
    expect(html).toContain('value="JobAura"')
    expect(html).toContain('checked=""')
    client.clear()
  })
})
