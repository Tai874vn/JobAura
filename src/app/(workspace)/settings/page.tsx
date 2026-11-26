import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SettingsLoading } from '@/features/workspace/components/settings/settings-loading'
import { SettingsPage } from '@/features/workspace/components/settings/settings-page'

export const metadata: Metadata = { title: 'Settings' }

export default function Page() {
  return (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPage />
    </Suspense>
  )
}
