import type { Metadata } from 'next'
import { ConnectionsPage } from '@/features/connections/components/connections-page'

export const metadata: Metadata = { title: 'Connections' }

// Page /connections — renders <ConnectionsPage> (features/connections/components/connections-page.tsx).
// Page settings: src/features/connections/config/connections.ts
export default function Page() {
  return <ConnectionsPage />
}
