import { BriefcaseBusiness, Mail, Phone, ShieldCheck } from 'lucide-react'
import type { User } from '@/shared/schemas'
import { Badge, Card, CardContent } from '@/shared/ui'
import { initials } from '@/shared/lib/utils'

export function ProfilePage({ user }: { user: User }) {
  return (
    <div className="container-page py-8">
      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-[240px_1fr]">
          <div className="rounded-lg bg-surface-muted p-5 text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary font-display text-3xl font-bold text-white">
              {initials(user.name)}
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">{user.name}</h1>
            <Badge className="mt-3" tone={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role ?? 'user'}</Badge>
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold">Public profile</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {user.certification || user.skill || 'This JobAura member has not added a full profile summary yet.'}
            </p>
            <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
              <Info icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
              <Info icon={<Phone className="h-4 w-4" />} label="Phone" value={user.phone ?? '-'} />
              <Info icon={<BriefcaseBusiness className="h-4 w-4" />} label="Skills" value={user.skill ?? '-'} />
              <Info icon={<ShieldCheck className="h-4 w-4" />} label="Certification" value={user.certification ?? '-'} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-3">
      <span className="text-primary">{icon}</span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span className="font-semibold">{value}</span>
      </span>
    </div>
  )
}
