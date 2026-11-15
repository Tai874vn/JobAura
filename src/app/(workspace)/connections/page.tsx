import type { Metadata } from 'next'
import { ConnectionsPage } from '@/features/connections/connections-page'

export const metadata: Metadata = { title: 'Connections' }

export default function Page() {
  return <ConnectionsPage />
}
