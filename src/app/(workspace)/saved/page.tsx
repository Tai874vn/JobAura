import type { Metadata } from 'next'
import { SavedPage } from '@/features/saved/components/saved-page'

export const metadata: Metadata = { title: 'Saved' }

// Page /saved — renders <SavedPage> (features/saved/components/saved-page.tsx).
export default function Page() {
  return <SavedPage />
}
