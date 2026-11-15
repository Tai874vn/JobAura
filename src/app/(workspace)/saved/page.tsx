import type { Metadata } from 'next'
import { SavedPage } from '@/features/saved/saved-page'

export const metadata: Metadata = { title: 'Saved' }

export default function Page() {
  return <SavedPage />
}
