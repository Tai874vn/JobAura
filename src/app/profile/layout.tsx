import { PublicShell } from '@/features/layout/public-shell'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
