import { PublicShell } from '@/features/layout/components/public-shell'

// Layout for every page under /jobs — renders <PublicShell> (features/layout/components/public-shell.tsx).
export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
