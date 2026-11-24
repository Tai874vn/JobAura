export const queryKeys = {
  me: ['auth', 'me'] as const,
  jobs: (params?: object) => ['jobs', params ?? {}] as const,
  jobsCursor: (params?: object) => ['jobs', 'cursor', params ?? {}] as const,
  jobsByCreator: (creatorId: number, params?: object) => ['jobs', 'creator', creatorId, params ?? {}] as const,
  job: (id: number) => ['jobs', id] as const,
  hiringPosts: (params?: object) => ['hiring-posts', params ?? {}] as const,
  hiringPostFacets: (params?: object) => ['hiring-posts', 'facets', params ?? {}] as const,
  hiringPostLocations: ['hiring-posts', 'locations'] as const,
  myHiringPosts: (params?: object) => ['hiring-posts', 'mine', params ?? {}] as const,
  hiringApplications: (hiringPostId: number, params?: object) => ['hiring-posts', hiringPostId, 'applications', params ?? {}] as const,
  myHiringApplications: (params?: object) => ['hiring-posts', 'applications', 'me', params ?? {}] as const,
  categories: ['categories'] as const,
  subcategories: ['subcategories'] as const,
  recommendedJobs: (params?: object) => ['recommendations', 'jobs', params ?? {}] as const,
  recommendationQuota: ['recommendations', 'quota'] as const,
  recommendedCandidates: (hiringPostId: number, params?: object) => ['recommendations', 'hiring-posts', hiringPostId, 'candidates', params ?? {}] as const,
  candidates: (params?: object) => ['users', 'candidates', params ?? {}] as const,
  users: (params?: object) => ['users', params ?? {}] as const,
  myProfile: ['users', 'me', 'profile'] as const,
  myResume: ['users', 'me', 'resume'] as const,
  notifications: ['notifications', 'list'] as const,
  notificationUnreadCount: ['notifications', 'unread-count'] as const,
  comments: ['comments'] as const,
  hires: ['hires'] as const,
  feed: ['posts', 'feed'] as const,
  feedStats: ['posts', 'me', 'stats'] as const,
  postComments: (postId: number) => ['posts', postId, 'comments'] as const,
  postReplies: (postId: number, commentId: number) => ['posts', postId, 'comments', commentId, 'replies'] as const,
  savedPosts: ['saved', 'posts'] as const,
  savedJobs: ['saved', 'jobs', 'pages'] as const,
  savedJobsPreview: ['saved', 'jobs', 'preview'] as const,
  connections: (params?: object) => ['connections', 'list', params ?? {}] as const,
  connectionRequests: ['connections', 'requests'] as const,
  connectionSuggestions: (params?: object) => ['connections', 'suggestions', params ?? {}] as const,
  connectionStatus: (userId: number) => ['connections', 'status', userId] as const,
  chatRooms: ['chat', 'rooms'] as const,
  chatMessages: (roomId: number) => ['chat', 'messages', roomId] as const,
  adminStats: ['admin', 'stats'] as const,
} as const

/**
 * Keys for the hiring pipeline. Every key carries the application or post id, so a person never sees
 * cached data that belongs to someone else.
 */
export const pipelineKeys = {
  detail: (id: number) => ['pipeline', 'application', id] as const,
  list: (postId: number, params?: object) => ['pipeline', 'post', postId, params ?? {}] as const,
  mine: (params?: object) => ['pipeline', 'mine', params ?? {}] as const,
  upcoming: ['pipeline', 'upcoming'] as const,
} as const

/**
 * Keys for service contracts. Every key carries the id or the viewer's side and page, so a person never
 * sees cached data that belongs to someone else.
 */
export const contractKeys = {
  proposal: (id: number) => ['contracts', 'proposal', id] as const,
  contract: (id: number) => ['contracts', 'contract', id] as const,
  proposals: (p: object) => ['contracts', 'proposals', p] as const,
  contracts: (p: object) => ['contracts', 'list', p] as const,
} as const

/** Keys for the credit wallet. The whole ['wallet'] branch is cleared when someone signs out. */
export const walletKeys = {
  summary: ['wallet', 'summary'] as const,
  ledger: (p: object) => ['wallet', 'ledger', p] as const,
} as const
