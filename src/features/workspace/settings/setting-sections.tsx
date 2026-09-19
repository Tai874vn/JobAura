import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  Eye,
  FileJson,
  KeyRound,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { UserProfile, UserResume } from '@/shared/schemas'
import { Avatar, Button, Card, CardContent } from '@/shared/ui'

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

const comingNextTitles = settingSections
  .filter((section) => !['overview', 'profile', 'resume'].includes(section.id))
  .map((section) => section.title)

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
  const attention: Array<{ key: string; icon: React.ReactNode; title: string; text: string; section: SettingSection }> = []
  if (!resume) {
    attention.push({
      key: 'resume',
      icon: <FileJson className="h-4 w-4" />,
      title: 'Resume not imported',
      text: 'Add your CV so AI matching can rank jobs for you.',
      section: 'resume',
    })
  }
  if (profile.role === 'user' && !profile.candidateDiscoverable) {
    attention.push({
      key: 'visibility',
      icon: <Eye className="h-4 w-4" />,
      title: 'Hidden from recruiters',
      text: 'Turn on recruiter visibility so employers can find you.',
      section: 'profile',
    })
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Profile readiness</p>
            <h2 className="mt-1 font-display text-4xl font-bold leading-tight">
              {completion}% <span className="text-sm font-semibold text-muted">complete</span>
            </h2>
            <p className="mt-2.5 max-w-md text-[13px] leading-6 text-muted">
              A complete profile gives buyers enough context to trust your services — and powers better AI matches.
            </p>
            <div className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-bright"
                style={{ width: `${completion}%` }}
                role="progressbar"
                aria-label="Profile readiness"
                aria-valuenow={completion}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
          <div className="border-t border-border pt-5 text-center lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <Avatar name={profile.name} src={profile.avatar} size="lg" className="mx-auto h-14 w-14 text-lg" />
            <b className="mt-2.5 block truncate text-[15px] font-bold">{profile.name}</b>
            <span className="mt-0.5 block max-w-40 truncate text-xs text-muted">{profile.email}</span>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => onSelect('profile')}>Edit profile</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 pb-4">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            <AlertCircle className="h-3.5 w-3.5 text-primary" /> Needs your attention
          </p>
          {attention.length ? (
            <div className="grid gap-2.5">
              {attention.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.section)}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3.5 text-left transition hover:border-primary hover:shadow-[0_8px_24px_rgba(27,28,28,0.06)]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rating/15 text-[#5c4300]">{item.icon}</span>
                  <span className="min-w-0">
                    <b className="block text-[13.5px]">{item.title}</b>
                    <span className="mt-0.5 block text-[12.5px] text-muted">{item.text}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted" />
                </button>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 py-2 text-[12.5px] font-semibold text-muted">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Everything is set — no pending setup items.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted">
        <b className="font-bold">{comingNextTitles.join(' · ')}</b> are coming next — watch this space.
      </p>
    </div>
  )
}

export function SettingsPlaceholder({ section }: { section: SettingSection }) {
  const current = settingSections.find((item) => item.id === section)

  return (
    <Card>
      <CardContent className="p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">
          {current?.icon}
        </span>
        <h2 className="mt-3.5 font-display text-xl font-bold">{current?.title} is coming next</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          {current?.description ?? 'Future account controls'} will live here. The settings hub is ready — this panel
          activates as soon as the backend APIs ship.
        </p>
      </CardContent>
    </Card>
  )
}
