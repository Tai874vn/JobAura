'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, MapPin, MessageSquare, Pencil, Sparkles, Star, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { chatApi, commentsApi, hiredJobsApi, jobsApi, recommendationsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { currency, getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { Comment, Job, RecommendedCandidate } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { useChatStore } from '@/shared/stores/chat-store'
import { Badge, Button, Card, CardContent, Textarea } from '@/shared/ui'
import { MatchBadge } from './recommendation-ui'
import { getSellerAvatar, getSellerHref, getSellerId, getSellerName } from './seller-profile'

function candidateSkills(candidate: RecommendedCandidate) {
  return (candidate.profileSkills ?? candidate.skills ?? []).filter((skill) => skill?.name).slice(0, 3)
}

export function JobDetailView({ job, comments }: { job: Job; comments: Comment[] }) {
  const imageUrl = resolveAssetUrl(job.hinhAnh)
  const bypassOptimizer = shouldBypassImageOptimizer(job.hinhAnh)
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const openChat = useChatStore((state) => state.openChat)
  const openChatForRoom = useChatStore((state) => state.openChatForRoom)
  const [review, setReview] = useState('')
  const [rating, setRating] = useState(5)
  const isOwner = user?.id === job.nguoiTao
  const candidateParams = { topK: 5, poolSize: 100 }
  const sellerId = getSellerId(job)
  const sellerName = getSellerName(job)
  const sellerHref = getSellerHref(job)
  const sellerAvatarSource = getSellerAvatar(job)
  const sellerAvatarUrl = resolveAssetUrl(sellerAvatarSource)
  const bypassSellerAvatarOptimizer = shouldBypassImageOptimizer(sellerAvatarSource)

  const hireMutation = useMutation({
    mutationFn: () => hiredJobsApi.create({ maCongViec: job.id }),
    onSuccess: () => toast.success('Service hired successfully'),
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to hire this service')),
  })

  const commentMutation = useMutation({
    mutationFn: () => commentsApi.create({ maCongViec: job.id, noiDung: review, saoBinhLuan: rating }),
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

  const candidateQuery = useQuery({
    queryKey: queryKeys.recommendedCandidates(job.id, candidateParams),
    queryFn: () => recommendationsApi.candidates(job.id, candidateParams),
    enabled: Boolean(isOwner),
    staleTime: 1000 * 60 * 5,
  })
  const recommendedCandidates = candidateQuery.data?.content?.data ?? []

  function requireLogin(action: () => void) {
    if (!user) router.push(`/auth/login?next=/jobs/${job.id}`)
    else action()
  }

  return (
    <div className="container-page py-8">
      <div className="mb-5 text-sm font-semibold text-muted">Marketplace / {job.chiTietLoaiCongViec?.tenChiTiet ?? 'Service'} / #{job.id}</div>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <main>
          <h1 className="max-w-4xl font-display text-4xl font-bold leading-tight">{job.tenCongViec}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Badge tone="rating"><Star className="mr-1 h-3 w-3 fill-rating text-rating" /> {(job.saoCongViec ?? 0).toFixed(1)}</Badge>
            <span className="text-sm font-semibold text-muted">{comments.length} reviews</span>
            <Badge tone="accent">{job.chiTietLoaiCongViec?.tenChiTiet ?? 'Marketplace'}</Badge>
          </div>
          <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-lg border border-border bg-surface-muted">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={job.tenCongViec}
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
          <Card className="mt-6">
            <CardContent>
              <h2 className="font-display text-2xl font-bold">About this service</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{job.moTa || job.moTaNgan || 'The seller has not added a long description yet.'}</p>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardContent>
              <h2 className="font-display text-2xl font-bold">Reviews</h2>
              <div className="mt-4 space-y-4">
                {comments.length ? comments.map((comment) => (
                  <div key={comment.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{initials(comment.nguoiDung?.name)}</span>
                      <div>
                        <p className="text-sm font-bold">{comment.nguoiDung?.name ?? 'Buyer'}</p>
                        <p className="text-xs text-rating">{'★'.repeat(comment.saoBinhLuan)}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted">{comment.noiDung}</p>
                  </div>
                )) : <p className="text-sm text-muted">No reviews yet.</p>}
              </div>
              <div className="mt-5 rounded-lg bg-surface-muted p-4">
                <div className="mb-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} className={value <= rating ? 'text-rating' : 'text-border'} onClick={() => setRating(value)} type="button">★</button>
                  ))}
                </div>
                <Textarea placeholder="Write a review" value={review} onChange={(event) => setReview(event.target.value)} />
                <Button className="mt-3" onClick={() => requireLogin(() => commentMutation.mutate())} disabled={!review.trim() || commentMutation.isPending}>
                  Post review
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent>
              <p className="text-sm text-muted">Starting at</p>
              <p className="mt-1 font-display text-4xl font-bold">{currency(job.giaTien)}</p>
              <ul className="mt-5 space-y-3 text-sm">
                {['3-day delivery', '3 revisions', 'Source files included', 'Commercial use'].map((item) => (
                  <li key={item} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> {item}</li>
                ))}
              </ul>
              <Button className="mt-6 w-full" size="lg" onClick={() => requireLogin(() => hireMutation.mutate())}>Continue ({currency(job.giaTien)})</Button>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                onClick={() => requireLogin(() => contactSellerMutation.mutate())}
                disabled={contactSellerMutation.isPending}
              >
                <MessageSquare className="h-4 w-4" />
                {contactSellerMutation.isPending ? 'Opening chat...' : 'Contact seller'}
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardContent>
              <div className="flex items-center gap-3">
                {sellerHref ? (
                  <Link
                    href={sellerHref}
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white"
                    aria-label={`View ${sellerName} profile`}
                  >
                    {sellerAvatarUrl ? (
                      <Image src={sellerAvatarUrl} alt={sellerName} fill unoptimized={bypassSellerAvatarOptimizer} className="object-cover" sizes="48px" />
                    ) : (
                      initials(sellerName)
                    )}
                  </Link>
                ) : (
                  <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-white">
                    {sellerAvatarUrl ? (
                      <Image src={sellerAvatarUrl} alt={sellerName} fill unoptimized={bypassSellerAvatarOptimizer} className="object-cover" sizes="48px" />
                    ) : (
                      initials(sellerName)
                    )}
                  </span>
                )}
                <div>
                  {sellerHref ? (
                    <Link href={sellerHref} className="font-bold hover:text-primary">{sellerName}</Link>
                  ) : (
                    <p className="font-bold">{sellerName}</p>
                  )}
                  <p className="text-xs text-muted">Top Rated Seller · 1h response</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {isOwner ? (
            <>
              <div className="mt-4 grid gap-2">
                <Button variant="secondary"><Pencil className="h-4 w-4" /> Edit service</Button>
                <Button variant="secondary"><Upload className="h-4 w-4" /> Upload image</Button>
                <Button variant="danger" onClick={() => deleteMutation.mutate()}><Trash2 className="h-4 w-4" /> Delete</Button>
              </div>
              <Card className="mt-4">
                <CardContent>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
                        <Sparkles className="h-4 w-4" />
                        AI matches
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold">Candidate matches</h2>
                    </div>
                    {candidateQuery.data?.content?.elapsedMs ? (
                      <span className="text-xs font-semibold text-muted">{Math.round(candidateQuery.data.content.elapsedMs)}ms</span>
                    ) : null}
                  </div>
                  {candidateQuery.isPending ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-16 animate-pulse rounded bg-surface-muted" />
                      ))}
                    </div>
                  ) : candidateQuery.isError ? (
                    <p className="text-sm text-muted">Candidate matches are unavailable.</p>
                  ) : recommendedCandidates.length ? (
                    <div className="divide-y divide-border">
                      {recommendedCandidates.map((candidate) => {
                        const skills = candidateSkills(candidate)

                        return (
                          <Link key={candidate.id} href={`/profile/${candidate.id}`} className="block py-3 transition hover:text-primary">
                            <div className="flex items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                                {initials(candidate.name)}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="truncate text-sm font-bold text-foreground">{candidate.name}</p>
                                  <MatchBadge label={candidate.recommendation.label} score={candidate.recommendation.finalScore} />
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-muted">{candidate.headline || candidate.bio || 'Candidate profile'}</p>
                                {candidate.location ? (
                                  <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                                    <MapPin className="h-3 w-3" />
                                    {candidate.location}
                                  </p>
                                ) : null}
                                {skills.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {skills.map((skill) => (
                                      <Badge key={skill.id ?? skill.name} tone="neutral">{skill.name}</Badge>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No candidate matches yet.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
