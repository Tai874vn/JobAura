/**
 * Stable viewer segment for TanStack Query keys. Keeps visitor cache entries ('anon')
 * separate from each signed-in account (its numeric user id) so switching accounts or
 * signing in never serves another viewer's cached payload.
 */
export function viewerScope(viewerId?: number | null): number | 'anon' {
  return typeof viewerId === 'number' && viewerId > 0 ? viewerId : 'anon'
}

export const queryKeys = {
  me: ['auth', 'me'] as const,
  jobs: (params?: object) => ['jobs', params ?? {}] as const,
  jobsCursor: (params?: object) => ['jobs', 'cursor', params ?? {}] as const,
  jobsByCreator: (creatorId: number, params?: object) => ['jobs', 'creator', creatorId, params ?? {}] as const,
  job: (id: number) => ['jobs', id] as const,
  hiringPosts: (params?: object, viewerId?: number | null) => ['hiring-posts', viewerScope(viewerId), params ?? {}] as const,
  hiringPostFacets: (params?: object) => ['hiring-posts', 'facets', params ?? {}] as const,
  hiringPostLocations: ['hiring-posts', 'locations'] as const,
  myHiringPosts: (params?: object, viewerId?: number | null) => ['hiring-posts', 'mine', viewerScope(viewerId), params ?? {}] as const,
  hiringApplications: (hiringPostId: number, params?: object, viewerId?: number | null) => ['hiring-posts', hiringPostId, 'applications', viewerScope(viewerId), params ?? {}] as const,
  myHiringApplications: (params?: object, viewerId?: number | null) => ['hiring-posts', 'applications', 'me', viewerScope(viewerId), params ?? {}] as const,
  categories: ['categories'] as const,
  subcategories: ['subcategories'] as const,
  recommendedJobs: (params?: object, viewerId?: number | null) => ['recommendations', 'jobs', viewerScope(viewerId), params ?? {}] as const,
  // Prefix constant kept for invalidations and callers in features/candidates.
  recommendationQuota: ['recommendations', 'quota'] as const,
  viewerRecommendationQuota: (viewerId?: number | null) => ['recommendations', 'quota', viewerScope(viewerId)] as const,
  recommendedCandidates: (hiringPostId: number, params?: object, viewerId?: number | null) => ['recommendations', 'hiring-posts', hiringPostId, 'candidates', viewerScope(viewerId), params ?? {}] as const,
  candidates: (params?: object, viewerId?: number | null) => ['users', 'candidates', viewerScope(viewerId), params ?? {}] as const,
  users: (params?: object) => ['users', params ?? {}] as const,
  myProfile: (viewerId?: number | null) => ['users', 'me', 'profile', viewerScope(viewerId)] as const,
  myResume: (viewerId?: number | null) => ['users', 'me', 'resume', viewerScope(viewerId)] as const,
  notifications: (viewerId?: number | null) => ['notifications', 'list', viewerScope(viewerId)] as const,
  notificationUnreadCount: (viewerId?: number | null) => ['notifications', 'unread-count', viewerScope(viewerId)] as const,
  comments: ['comments'] as const,
  feed: (viewerId?: number | null) => ['posts', 'feed', viewerScope(viewerId)] as const,
  feedStats: (viewerId?: number | null) => ['posts', 'me', 'stats', viewerScope(viewerId)] as const,
  postComments: (postId: number) => ['posts', postId, 'comments'] as const,
  postReplies: (postId: number, commentId: number) => ['posts', postId, 'comments', commentId, 'replies'] as const,
  savedPosts: (viewerId?: number | null) => ['saved', 'posts', viewerScope(viewerId)] as const,
  savedJobs: (viewerId?: number | null) => ['saved', 'jobs', 'pages', viewerScope(viewerId)] as const,
  savedJobsPreview: (viewerId?: number | null) => ['saved', 'jobs', 'preview', viewerScope(viewerId)] as const,
  connections: (params?: object, viewerId?: number | null) => ['connections', 'list', viewerScope(viewerId), params ?? {}] as const,
  connectionRequests: (viewerId?: number | null) => ['connections', 'requests', viewerScope(viewerId)] as const,
  connectionSuggestions: (params?: object, viewerId?: number | null) => ['connections', 'suggestions', viewerScope(viewerId), params ?? {}] as const,
  connectionStatus: (userId: number, viewerId?: number | null) => ['connections', 'status', viewerScope(viewerId), userId] as const,
  chatRooms: (viewerId?: number | null) => ['chat', 'rooms', viewerScope(viewerId)] as const,
  chatMessages: (roomId: number, viewerId?: number | null) => ['chat', 'messages', viewerScope(viewerId), roomId] as const,
  adminStats: (viewerId?: number | null) => ['admin', 'stats', viewerScope(viewerId)] as const,
} as const

/**
 * Keys for the hiring pipeline. Every key carries the viewer id alongside the application or post id,
 * so a person never sees cached data that belongs to someone else.
 */
export const pipelineKeys = {
  detail: (id: number, viewerId?: number | null) => ['pipeline', 'application', viewerScope(viewerId), id] as const,
  list: (postId: number, params?: object, viewerId?: number | null) => ['pipeline', 'post', postId, viewerScope(viewerId), params ?? {}] as const,
  mine: (params?: object, viewerId?: number | null) => ['pipeline', 'mine', viewerScope(viewerId), params ?? {}] as const,
  upcoming: (viewerId?: number | null) => ['pipeline', 'upcoming', viewerScope(viewerId)] as const,
} as const

/**
 * Keys for service contracts. Every key carries the viewer id alongside the item id or list filters,
 * so a person never sees cached data that belongs to someone else.
 */
export const contractKeys = {
  proposal: (id: number, viewerId?: number | null) => ['contracts', 'proposal', viewerScope(viewerId), id] as const,
  contract: (id: number, viewerId?: number | null) => ['contracts', 'contract', viewerScope(viewerId), id] as const,
  proposals: (p: object, viewerId: number | null | undefined) => ['contracts', 'proposals', viewerScope(viewerId), p] as const,
  contracts: (p: object, viewerId: number | null | undefined) => ['contracts', 'list', viewerScope(viewerId), p] as const,
} as const

/** Keys for the credit wallet. Scoped by viewer id, and the whole ['wallet'] branch is cleared on sign-out. */
export const walletKeys = {
  summary: (viewerId?: number | null) => ['wallet', 'summary', viewerScope(viewerId)] as const,
  ledger: (p: object, viewerId: number | null | undefined) => ['wallet', 'ledger', viewerScope(viewerId), p] as const,
  topUpStatus: (topUpId: number | null, viewerId?: number | null) => ['wallet', 'top-up-status', viewerScope(viewerId), topUpId] as const,
} as const
