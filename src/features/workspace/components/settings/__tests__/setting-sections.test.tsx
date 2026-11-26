import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { UserProfile } from '@/shared/schemas'
import { SettingsOverview } from '../setting-sections'

const profile: UserProfile = { id: 6, name: 'Ava', email: 'ava@example.com', role: 'user', candidateDiscoverable: true }

describe('Settings overview resume status', () => {
  it('does not report a missing resume before the request completes', () => {
    const html = renderToStaticMarkup(<SettingsOverview profile={profile} completion={20} resume={null}
      resumeLoading onSelect={() => undefined} />)
    expect(html).toContain('Checking resume')
    expect(html).not.toContain('Resume not imported')
    expect(html).not.toContain('Everything is set')
  })

  it('offers recovery instead of reporting an empty resume after a failed request', () => {
    const html = renderToStaticMarkup(<SettingsOverview profile={profile} completion={20} resume={null}
      resumeError onRetryResume={() => undefined} onSelect={() => undefined} />)
    expect(html).toContain('Resume status unavailable')
    expect(html).toContain('Retry')
    expect(html).not.toContain('Resume not imported')
  })

  it('offers import only after the server confirms there is no resume', () => {
    const html = renderToStaticMarkup(<SettingsOverview profile={profile} completion={20} resume={null} onSelect={() => undefined} />)
    expect(html).toContain('Resume not imported')
    expect(html).toContain('Add resume')
  })

  it('does not show a resume card to recruiters', () => {
    const recruiter: UserProfile = { ...profile, role: 'employer' }
    const html = renderToStaticMarkup(<SettingsOverview profile={recruiter} completion={20} resume={null}
      resumeError onSelect={() => undefined} />)
    expect(html).not.toContain('Resume')
  })
})
