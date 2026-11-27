/**
 * Saved items page (/saved) in the workspace.
 * Shows the user's saved listings and bookmarks.
 *
 * Calls: SavedPage
 * Used by:
 *   - Next.js router: page for /saved
 */

import type { Metadata } from 'next'
import { SavedPage } from '@/features/saved/components/saved-page'

export const metadata: Metadata = { title: 'Saved' }

// Page /saved — renders <SavedPage> (features/saved/components/saved-page.tsx).
export default function Page() {
  return <SavedPage />
}
