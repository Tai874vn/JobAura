import { StatusBadge } from '@/features/hiring-pipeline/components/status-badge'
import type { HiringPost } from '@/shared/schemas'
import { ButtonLink } from '@/shared/ui'

/** What a candidate who applied sees instead of the Apply button: their status and a link to the application. */
export function AppliedAction({ application }: { application: NonNullable<HiringPost['viewerApplication']> | null | undefined }) {
  return (
    <div className="grid gap-2">
      {application ? (
        <div><StatusBadge status={application.status} viewer="candidate" reason={application.statusReason} /></div>
      ) : null}
      <ButtonLink href={application ? `/my-applications?application=${application.id}` : '/my-applications'} variant="secondary" className="w-full">
        View my application
      </ButtonLink>
    </div>
  )
}
