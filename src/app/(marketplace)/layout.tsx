import { PublicShell } from '@/features/layout/components/public-shell'

// Layout for every page in app/(marketplace)/ — renders <PublicShell> (features/layout/components/public-shell.tsx).
export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>
}
