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


export function SettingsOverview({
  profile, completion, resume, resumeLoading = false, resumeError = false,
  resumeRetrying = false, onRetryResume, onSelect,
}: {
  profile: UserProfile
  completion: number
  resume: UserResume | null
  resumeLoading?: boolean
  resumeError?: boolean
  resumeRetrying?: boolean
  onRetryResume?: () => void
  onSelect: (section: SettingSection) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Your workspace, at a glance</h2>
        <p className="mt-1 text-sm leading-6 text-muted">Keep your public profile and career details up to date.</p>
      </div>
      <Card className="overflow-hidden border-l-4 border-l-primary">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={profile.name} src={profile.avatar} size="lg" className="h-14 w-14 text-lg" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-display text-xl font-bold">{profile.name}</h3>
              <p className="mt-0.5 break-words text-sm text-muted">{profile.headline || 'Add a headline that describes your work.'}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onSelect('profile')}>Edit profile <ArrowRight className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">Profile readiness</span><span className="font-bold text-primary">{completion}%</span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar"
              aria-label="Profile readiness" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-2.5 text-xs leading-5 text-muted">Your photo, skills, and work samples help people understand what you offer.</p>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <UserRound className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-display text-lg font-bold">Public profile</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted">Edit your introduction, skills, certifications, and portfolio.</p>
            {profile.role === 'user' ? <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted"><Eye className="h-3.5 w-3.5" />{profile.candidateDiscoverable ? 'Visible to recruiters' : 'Hidden from recruiters'}</p> : null}
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onSelect('profile')}>Manage profile <ArrowRight className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex h-full flex-col p-5 sm:p-6">
            <FileJson className="h-5 w-5 text-primary" />
            <h3 className="mt-3 font-display text-lg font-bold">Resume</h3>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted">Add career details and a CV to support your AI job matches.</p>
            {resumeLoading ? (
              <p role="status" className="mt-3 text-xs text-muted">Checking resume…</p>
            ) : resumeError ? (
              <div role="alert" className="mt-3">
                <p className="text-xs font-semibold text-danger">Resume status unavailable</p>
                <Button className="mt-2" variant="secondary" size="sm" loading={resumeRetrying} onClick={onRetryResume}>Retry</Button>
              </div>
            ) : (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted">
                {resume ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {resume ? 'Resume imported' : 'Resume not imported'}
              </p>
            )}
            <Button className="mt-4 w-full" variant="secondary" onClick={() => onSelect('resume')}>
              {resumeLoading || resumeError ? 'Open resume' : resume ? 'Manage resume' : 'Add resume'} <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function SettingsPlaceholder({ section }: { section: SettingSection }) {
  const current = settingSections.find((item) => item.id === section)
  return (
    <Card>
      <CardContent className="p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary [&_svg]:h-5 [&_svg]:w-5">{current?.icon}</span>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Coming soon</p>
        <h2 className="mt-1 font-display text-xl font-bold">{current?.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">These controls are not available yet. You can manage your profile and resume in the other sections.</p>
      </CardContent>
    </Card>
  )
}
