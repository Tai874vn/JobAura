'use client'

import { useQuery } from '@tanstack/react-query'
import { FilePlus2 } from 'lucide-react'
import { useState } from 'react'
import { jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import type { Job } from '@/shared/schemas'
import { Button } from '@/shared/ui'
import { servicePriceLabel } from '@/features/jobs/service-price'
import { NewProposalDialog } from './proposal/new-proposal-dialog'

/** The services a person can be hired for: only the ones with a price (a portfolio post has price 0). */
export function pricedServices(jobs: readonly Job[]) {
  return jobs.filter((job) => job.price > 0)
}

/**
 * "Send a proposal" in a direct chat. It shows only when the other person has at least one priced service (and
 * is not you). The client picks one of those services, then the proposal editor opens for it.
 */
export function ChatProposalButton({ otherUserId, viewerId, onSent }: { otherUserId: number; viewerId: number; onSent?: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [chosen, setChosen] = useState<Job | null>(null)
  const params = { page: 1, pageSize: 50 }
  const query = useQuery({
    queryKey: queryKeys.jobsByCreator(otherUserId, params),
    queryFn: () => jobsApi.byCreator(otherUserId, params),
    enabled: otherUserId !== viewerId,
  })
  const services = pricedServices(query.data?.content?.data ?? [])
  if (otherUserId === viewerId || !services.length) return null

  return (
    <div className="border-t border-border bg-surface px-2.5 py-2">
      <Button type="button" variant="secondary" size="sm" aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)}>
        <FilePlus2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Send a proposal
      </Button>
      {pickerOpen ? (
        <ul className="menu-drop mt-2 max-h-40 divide-y divide-border overflow-y-auto rounded-md border border-border" aria-label="Pick a service">
          {services.map((service) => (
            <li key={service.id}>
              <button
                type="button"
                className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                onClick={() => { setChosen(service); setPickerOpen(false) }}
              >
                <span className="min-w-0 truncate font-medium">{service.title}</span>
                <span className="shrink-0 text-xs text-muted">{servicePriceLabel(service.price)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {chosen ? <NewProposalDialog job={chosen} onSent={onSent} onClose={() => setChosen(null)} /> : null}
    </div>
  )
}
