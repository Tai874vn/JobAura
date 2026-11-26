import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SettingsLoading } from '@/features/workspace/components/settings/settings-loading'
import { SettingsPage } from '@/features/workspace/components/settings/settings-page'

export const metadata: Metadata = { title: 'Settings' }

// Page /settings — renders <SettingsPage> (features/workspace/components/settings/settings-page.tsx); while loading: <SettingsLoading>.
// Page settings: src/features/workspace/config/settings.ts
export default function Page() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPage />
    </Suspense>
  )
}
