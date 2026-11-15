'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Calendar, MessageSquare, Send, Sparkles, Star, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { chatApi, commentsApi, hiresApi, jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { canAccessCandidateDirectory } from '@/shared/lib/roles'
import { cn, currency, getErrorMessage, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import { isPortfolioPost } from './service-price'
import type { Comment, Job } from '@/shared/schemas'
import { useChatStore } from '@/shared/stores/chat-store'
import { Avatar, Badge, Button, ButtonLink, Card, CardContent, ConfirmationDialog, Textarea } from '@/shared/ui'
import { getSellerAvatar, getSellerHref, getSellerId, getSellerName } from './seller-profile'

export function JobDetailView({ job, comments }: { job: Job; comments: Comment[] }) {
  const imageUrl = resolveAssetUrl(job.image)
  const bypassOptimizer = shouldBypassImageOptimizer(job.image)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useSession()
  const openChat = useChatStore((state) => state.openChat)
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)
  const [review, setReview] = useState('')
  const [rating, setRating] = useState(5)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isOwner = user?.id === job.creatorId
  // A post without a rate is a portfolio post: no purchase steps, just ways to reach the candidate.
  const portfolio = isPortfolioPost(job.price)
  const canViewCandidateMatches = Boolean(user?.role === 'admin' || (isOwner && canAccessCandidateDirectory(user?.role)))
  const sellerId = getSellerId(job)
  const sellerName = getSellerName(job)
  const sellerHref = getSellerHref(job)
  const sellerAvatar = getSellerAvatar(job)
  const listedDate = formatListedDate(job.createdAt)

  const hireMutation = useMutation({
    mutationFn: () => hiresApi.create({ jobId: job.id }),
    onSuccess: () => toast.success('Service hired successfully'),
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to hire this service')),
  })

  const commentMutation = useMutation({
    mutationFn: () => commentsApi.create({ jobId: job.id, content: review, rating: rating }),
    onSuccess: () => {
      setReview('')
      queryClient.invalidateQueries({ queryKey: queryKeys.job(job.id) })
      toast.success('Review posted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to post review')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => jobsApi.delete(job.id),
    onSuccess: () => {
      setDeleteOpen(false)
      toast.success('Service deleted')
      router.push('/my-posts')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete service')),
  })

  const contactSellerMutation = useMutation({
    mutationFn: async () => {
      if (!sellerId) throw new Error('Seller is unavailable')
      return chatApi.start(sellerId)
    },
    onSuccess: (response) => {
      const room = response.content
      if (room) {
        openChatForRoom(room)
        queryClient.invalidateQueries({ queryKey: queryKeys.chatRooms })
      } else {
        openChat()
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to start chat')),
  })

  function requireLogin(action: () => void) {
    if (!user) router.push(`/auth/login?next=/jobs/${job.id}`)
    else action()
  }

  const sellerCard = (
    <Card>
      <CardContent className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Seller</p>
        <div className="mt-2.5 flex items-center gap-3">
          {sellerHref ? (
            <Link href={sellerHref} aria-label={`View ${sellerName} profile`} className="shrink-0">
              <Avatar name={sellerName} src={sellerAvatar} size="lg" />
            </Link>
          ) : (
            <Avatar name={sellerName} src={sellerAvatar} size="lg" className="shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            {sellerHref ? (
              <Link href={sellerHref} className="block truncate font-bold hover:text-primary">{sellerName}</Link>
            ) : (
              <p className="truncate font-bold">{sellerName}</p>
            )}
            <p className="truncate text-xs text-muted">{job.subcategory?.name ?? 'Marketplace seller'}</p>
          </div>
          {sellerHref ? <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" /> : null}
        </div>
        {listedDate ? (
          <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 text-xs font-semibold text-muted">
            <Calendar className="h-3.5 w-3.5" /> Listed {listedDate}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )

  return (
    <div className="container-page pt-8 pb-28 lg:pb-16">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-semibold text-muted" aria-label="Breadcrumb">
        <Link href="/jobs" className="hover:text-primary hover:underline">Marketplace</Link>
        <span aria-hidden="true" className="text-border">/</span>
        <span>{job.subcategory?.name ?? 'Service'}</span>
        <span aria-hidden="true" className="text-border">/</span>
        <span className="text-foreground">#{job.id}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main>
          <h1 className="max-w-4xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{job.title}</h1>
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            <Badge tone="rating"><Star className="mr-1 h-3 w-3 fill-rating text-rating" /> {(job.rating ?? 0).toFixed(1)}</Badge>
            <span className="text-sm font-semibold text-muted">{comments.length} {comments.length === 1 ? 'review' : 'reviews'}</span>
            <Badge tone="accent">{job.subcategory?.name ?? 'Marketplace'}</Badge>
            <span className="text-[12.5px] font-semibold text-muted">Service #{job.id}</span>
          </div>
          <div className="relative mt-5 aspect-[16/9] overflow-hidden rounded-lg border border-border bg-surface-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={job.title}
                fill
                priority
                sizes="(min-width: 1024px) calc(100vw - 456px), 100vw"
                unoptimized={bypassOptimizer}
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-6xl font-bold text-primary/20">JobAura</div>
            )}
          </div>
          <Card className="mt-5">
            <CardContent className="p-5">
              <h2 className="font-display text-2xl font-bold">About this service</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{job.description || job.shortDescription || 'The seller has not added a long description yet.'}</p>
            </CardContent>
          </Card>
          <Card className="mt-5">
            <CardContent className="p-5">
              <h2 className="font-display text-2xl font-bold">
                Reviews <span className="text-sm font-semibold text-muted">({comments.length})</span>
              </h2>
              <div className="mt-2">
                {comments.length ? comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 border-b border-border py-4 last:border-0 last:pb-0">
                    <Avatar name={comment.user?.name ?? 'Buyer'} src={comment.user?.avatar} size="md" className="shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{comment.user?.name ?? 'Buyer'}</p>
                      <ReviewStars count={comment.rating} />
                      <p className="mt-1.5 text-sm leading-6 text-muted">{comment.content}</p>
                    </div>
                  </div>
                )) : <p className="py-2 text-sm text-muted">No reviews yet. Be the first to share what it was like working with this seller.</p>}
              </div>
              <div className="mt-4 rounded-lg bg-surface-muted p-4">
                <p className="mb-2 text-[13px] font-bold">Rate this service</p>
                <div className="mb-2.5 flex gap-1" role="radiogroup" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                      className={cn('grid h-8 w-8 place-items-center rounded-lg transition hover:bg-surface', rating >= value ? 'text-rating' : 'text-border')}
                      onClick={() => setRating(value)}
                    >
                      <Star className={cn('h-5 w-5', rating >= value && 'fill-rating')} />
                    </button>
                  ))}
                </div>
                <Textarea aria-label="Your review" placeholder="Share what it was like working with this seller…" value={review} onChange={(event) => setReview(event.target.value)} />
                <div className="mt-3 flex justify-end">
                  <Button onClick={() => requireLogin(() => commentMutation.mutate())} loading={commentMutation.isPending} disabled={!review.trim()}>
                    <Send className="h-4 w-4" />
                    Post review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          {portfolio ? (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Portfolio post</p>
                <p className="mt-2 text-sm leading-6 text-muted">This shows the candidate&rsquo;s work. Message them to talk about a role, or open their profile and resume.</p>
                <Button className="mt-4 w-full" onClick={() => requireLogin(() => contactSellerMutation.mutate())} loading={contactSellerMutation.isPending}>
                  <MessageSquare className="h-4 w-4" />
                  Message candidate
                </Button>
                {job.creatorId ? <ButtonLink href={`/profile/${job.creatorId}`} className="mt-3 w-full" variant="secondary">View profile</ButtonLink> : null}
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted">Starting at</p>
              <p className="mt-0.5 font-display text-4xl font-bold tracking-tight">{currency(job.price)}</p>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">How it works</p>
                <ol className="mt-3 grid gap-3">
                  <BuyStep number={1} title="Agree in chat" text="Scope, timeline, and price — free, before you commit." />
                  <BuyStep number={2} title="Hire the service" text="One click here confirms the work at this price." />
                  <BuyStep number={3} title="Track in My jobs" text="Follow progress until the work is marked complete." />
                </ol>
              </div>
              <Button className="mt-5 w-full" size="lg" onClick={() => requireLogin(() => hireMutation.mutate())} loading={hireMutation.isPending}>Continue ({currency(job.price)})</Button>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={() => requireLogin(() => contactSellerMutation.mutate())}
                loading={contactSellerMutation.isPending}
              >
                <MessageSquare className="h-4 w-4" />
                Contact seller
              </Button>
            </CardContent>
          </Card>
          )}
          {sellerCard}
          {isOwner ? (
            <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete post</Button>
          ) : null}
          {canViewCandidateMatches ? (
            <Card>
              <CardContent>
                <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
                  <Sparkles className="h-4 w-4" />
                  Recruiter AI
                </p>
                <h2 className="mt-1 font-display text-xl font-bold">Find matching candidates</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Run AI matching from the recruiter page when you are ready. This avoids spending daily AI uses while browsing job details.
                </p>
                <ButtonLink href="/recommendations/candidates" className="mt-4 w-full" variant="secondary">
                  <Sparkles className="h-4 w-4" />
                  Open AI matching
                </ButtonLink>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>

      {portfolio ? null : <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-surface/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur lg:hidden" aria-label="Purchase bar">
        <div className="leading-tight">
          <b className="block font-display text-lg font-bold">{currency(job.price)}</b>
          <span className="text-[11px] font-semibold text-muted">Starting at</span>
        </div>
        <Button className="ml-auto flex-1" onClick={() => requireLogin(() => hireMutation.mutate())} loading={hireMutation.isPending}>
          Continue
        </Button>
      </div>}

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete this service?"
        description={`“${job.title}” will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete service"
        pending={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  )
}

function BuyStep({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary/10 text-[11.5px] font-extrabold text-primary">
        {number}
      </span>
      <span>
        <b className="block text-[13px]">{title}</b>
        <span className="text-xs leading-snug text-muted">{text}</span>
      </span>
    </li>
  )
}

function ReviewStars({ count }: { count: number }) {
  return (
    <div className="mt-0.5 flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} className={cn('h-3 w-3', value <= count ? 'fill-rating text-rating' : 'text-border')} />
      ))}
    </div>
  )
}

function formatListedDate(value: string | undefined) {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
