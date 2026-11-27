'use client'

/**
 * Wide list card for one portfolio or priced service on the /jobs browse page.
 * Shows the seller avatar and name, title, category badges, price and work mode, summary, reviews, and action buttons.
 *
 * Calls: jobCardActions; jobWorkModeSummary; portfolioPriceLabel; getSellerId; getSellerName; getSellerHref; getSellerAvatar; isPortfolioPost
 * Used by:
 *   - features/jobs/components/browse/job-list-view.tsx
 */

import { MessageSquare, Pencil, Star } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/shared/lib/utils'
import type { Job } from '@/shared/schemas'
import { Avatar } from '@/shared/ui'
import {
  jobCardActions,
  jobWorkModeSummary,
  portfolioPriceLabel,
  type JobViewer,
} from '../../utils/jobs-browse-view'
import { getSellerAvatar, getSellerHref, getSellerId, getSellerName } from '../../utils/seller-profile'
import { isPortfolioPost } from '../../utils/service-price'

const secondaryButton =
  'interaction inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

const primaryTintButton =
  'interaction inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg bg-[#e9f3ec] px-4 text-sm font-semibold text-primary hover:bg-[#d9ecdf] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

/**
 * One portfolio or priced service in the /jobs results column, styled like HiringPostResultCard:
 * avatar and title at the top, price and work mode on the right, short description in the middle,
 * and rating plus actions (View, Message, Send a proposal, Edit) along the bottom.
 */
export function JobResultCard({
  job,
  categoryName,
  viewer,
  onPropose,
}: {
  job: Job
  /** Parent field name when the job payload only carries the specialty (subcategory). */
  categoryName?: string
  viewer: JobViewer
  /** Opens NewProposalDialog for this priced service. */
  onPropose?: (job: Job) => void
}) {
  const href = `/jobs/${job.id}`
  const sellerId = getSellerId(job)
  const sellerName = getSellerName(job)
  const sellerHref = getSellerHref(job)
  const sellerAvatar = getSellerAvatar(job)
  const priceLabel = portfolioPriceLabel(job.price)
  const portfolio = isPortfolioPost(job.price)
  const workMode = jobWorkModeSummary(job)
  const actions = jobCardActions(job, viewer)
  const summary = job.shortDescription?.trim() || job.description?.trim()
  const fieldName = categoryName?.trim() || job.subcategory?.category?.name?.trim()
  const specialtyName = job.subcategory?.name?.trim()
  const reviews = job.reviews ?? 0
  const rating = job.rating ?? 0

  const avatar = <Avatar name={sellerName} src={sellerAvatar} size="lg" className="size-[46px]" />

  function openChat() {
    if (!sellerId) return
    // The global chat widget listens for this custom browser event (CustomEvent) and opens the direct room.
    window.dispatchEvent(new CustomEvent('jobaura:open-chat', { detail: { userId: sellerId } }))
  }

  return (
    <article
      aria-labelledby={`job-${job.id}-title`}
      className="group/card grid gap-3 rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#c5d8c8] hover:shadow-float sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          {sellerHref ? (
            <Link
              href={sellerHref}
              title={`View ${sellerName}'s profile`}
              aria-label={`View ${sellerName}'s profile`}
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {avatar}
            </Link>
          ) : (
            avatar
          )}

          <div className="min-w-0 flex-1">
            {/* Every card has the same height on wide screens (title 1 line, chip row and summary always
                take their space), so new results replace old ones in place instead of pushing the list
                around (layout shift, CLS 0.19–0.50 measured by the bot when filtering). */}
            <h2
              id={`job-${job.id}-title`}
              title={job.title}
              className="line-clamp-2 break-words text-xl font-semibold leading-tight tracking-[-0.01em] text-foreground sm:line-clamp-1 sm:text-2xl"
            >
              <Link
                href={href}
                className="transition-colors duration-150 group-hover/card:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {job.title}
              </Link>
            </h2>

            {sellerHref ? (
              <Link
                href={sellerHref}
                className="mt-0.5 block truncate text-sm font-medium text-muted transition-colors hover:text-primary hover:underline"
              >
                {sellerName}
              </Link>
            ) : (
              <p className="mt-0.5 truncate text-sm font-medium text-muted">{sellerName}</p>
            )}

            {fieldName || specialtyName ? (
              <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold sm:h-[26px] sm:flex-nowrap sm:overflow-hidden">
                {fieldName ? (
                  <span className="rounded-md bg-[#123f32] px-2 py-1 text-white">{fieldName}</span>
                ) : null}
                {specialtyName && specialtyName !== fieldName ? (
                  <span
                    className={cn(
                      'rounded-md px-2 py-1',
                      fieldName
                        ? 'border border-[#c5d8c8] bg-surface text-[#123f32]'
                        : 'bg-[#123f32] text-white',
                    )}
                  >
                    {specialtyName}
                  </span>
                ) : null}
              </p>
            ) : (
              <span aria-hidden="true" className="mt-2 hidden h-[26px] sm:block" />
            )}
          </div>
        </div>

        <div className="sm:w-[212px] sm:shrink-0 sm:text-right">
          {portfolio ? (
            <span className="inline-flex rounded-md bg-[#e9f3ec] px-2.5 py-1 text-xs font-semibold text-primary">
              {priceLabel}
            </span>
          ) : (
            <p className="text-[17px] font-semibold leading-snug text-primary tabular-nums">
              {priceLabel}
            </p>
          )}
          {workMode ? (
            <p className="mt-1 text-xs text-muted">{workMode}</p>
          ) : null}
        </div>
      </div>

      {summary ? (
        <p className="line-clamp-2 break-words text-sm leading-6 text-muted sm:h-12">{summary}</p>
      ) : (
        <span aria-hidden="true" className="hidden h-12 sm:block" />
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {reviews > 0 ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground tabular-nums">
              <Star className="h-3.5 w-3.5 fill-rating text-rating" aria-hidden="true" />
              {rating.toFixed(1)}
              <span className="font-normal text-muted">
                ({reviews} {reviews === 1 ? 'review' : 'reviews'})
              </span>
            </span>
          ) : (
            <span>No reviews yet</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className={secondaryButton}>
            View
          </Link>

          {actions.message === 'open' ? (
            <button type="button" onClick={openChat} className={secondaryButton}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Message
            </button>
          ) : actions.message === 'login' ? (
            <Link href={`/auth/login?next=${encodeURIComponent(href)}`} className={secondaryButton}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Message
            </Link>
          ) : null}

          {actions.proposal ? (
            <button type="button" onClick={() => onPropose?.(job)} className={primaryTintButton}>
              Send a proposal
            </button>
          ) : null}

          {actions.edit ? (
            <Link href={`/jobs/${job.id}/edit`} className={primaryTintButton}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
