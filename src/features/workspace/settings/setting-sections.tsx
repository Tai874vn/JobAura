import {
  Bell,
  CreditCard,
  FileJson,
  KeyRound,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { UserProfile, UserResume } from '@/shared/schemas'
import { Button, Card, CardContent } from '@/shared/ui'

export type SettingSection = 'overview' | 'profile' | 'resume' | 'account' | 'security' | 'appearance' | 'notifications' | 'billing'

export const settingSections: Array<{
  id: SettingSection
  title: string
  description: string
  icon: React.ReactNode
}> = [
  { id: 'overview', title: 'Overview', description: 'Choose what to configure', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'profile', title: 'Profile', description: 'Public identity and portfolio', icon: <UserRound className="h-4 w-4" /> },
  { id: 'resume', title: 'Resume', description: 'Import CV data for AI matching', icon: <FileJson className="h-4 w-4" /> },
  { id: 'account', title: 'Account', description: 'Email, role, and basic account data', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'security', title: 'Security', description: 'Password and session controls', icon: <KeyRound className="h-4 w-4" /> },
  { id: 'appearance', title: 'Appearance', description: 'Theme and display preferences', icon: <Palette className="h-4 w-4" /> },
  { id: 'notifications', title: 'Notifications', description: 'Marketplace alerts and email', icon: <Bell className="h-4 w-4" /> },
  { id: 'billing', title: 'Billing', description: 'Payments and invoices', icon: <CreditCard className="h-4 w-4" /> },
]

const settingSectionIds = new Set<SettingSection>(settingSections.map((section) => section.id))

export function isSettingSection(value: string | null): value is SettingSection {
  return Boolean(value && settingSectionIds.has(value as SettingSection))
}

export function SettingsOverview({
  profile,
  completion,
  resume,
  onSelect,
}: {
  profile: UserProfile
  completion: number
  resume: UserResume | null
  onSelect: (section: SettingSection) => void
}) {
  const cards = settingSections.filter((section) => section.id !== 'overview')

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_240px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Profile readiness</p>
            <h2 className="mt-1 font-display text-3xl font-bold">{completion}% complete</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              A complete profile gives buyers enough context to trust your services before they open a conversation.
            </p>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Signed in as</p>
            <p className="mt-2 truncate font-display text-xl font-bold">{profile.name}</p>
            <p className="mt-1 truncate text-sm text-muted">{profile.email}</p>
            <div className="mt-4 grid gap-2">
              <Button className="w-full" variant="secondary" onClick={() => onSelect('profile')}>Edit profile</Button>
              <Button className="w-full" variant={resume ? 'secondary' : 'primary'} onClick={() => onSelect('resume')}>
                {resume ? 'View resume' : 'Import resume'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((section) => (
          <button
            key={section.id}
            type="button"
            className="rounded-lg border border-border bg-white p-4 text-left transition hover:border-primary hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
            onClick={() => onSelect(section.id)}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{section.icon}</span>
            <span className="mt-4 block font-display text-xl font-bold">{section.title}</span>
            <span className="mt-1 block text-sm leading-6 text-muted">{section.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function SettingsPlaceholder({ section }: { section: SettingSection }) {
  const current = settingSections.find((item) => item.id === section)

  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Coming next</p>
        <h2 className="mt-1 font-display text-3xl font-bold">{current?.title ?? 'Settings'}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          This section is reserved for {current?.description.toLowerCase() ?? 'future account controls'}. The settings hub is ready, and this panel can be wired to backend APIs as those controls become available.
        </p>
      </CardContent>
    </Card>
  )
}
