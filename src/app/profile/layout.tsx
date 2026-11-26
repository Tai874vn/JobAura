import { PublicShell } from '@/features/layout/components/public-shell'

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
