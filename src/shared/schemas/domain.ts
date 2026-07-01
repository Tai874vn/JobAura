import { z } from 'zod'
import { accountRoles, signupRoles } from '@/shared/lib/roles'

export const apiResponseSchema = <T extends z.ZodType>(content: T) =>
  z.object({
    statusCode: z.number().optional(),
    message: z.union([z.string(), z.array(z.string())]).optional(),
    content: content.optional(),
    dateTime: z.string().optional(),
  })

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(12),
  keyword: z.string().optional(),
})

export const paginatedContentSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    pageIndex: z.number().optional(),
    pageSize: z.number().optional(),
    totalRow: z.number().optional(),
    totalPages: z.number().optional(),
    keywords: z.string().optional(),
    data: z.array(item).default([]),
  })

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().trim().pipe(z.email().toLowerCase()),
  passWord: z.string().optional(),
  phone: z.string().optional(),
  birthDay: z.string().optional(),
  avatar: z.string().optional().nullable(),
  gender: z.string().optional(),
  role: z.enum(accountRoles).optional(),
  skill: z.string().optional().nullable(),
  certification: z.string().optional().nullable(),
  googleId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const profileSkillSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  level: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
})

export const profileCertificationSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  issuer: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  credentialUrl: z.string().optional().nullable(),
  credentialId: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
})

export const profilePortfolioItemSchema = z.object({
  id: z.number().optional(),
  title: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
})

export const userProfileSchema = userSchema.extend({
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  cover: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  skills: z.array(profileSkillSchema).optional().nullable(),
  profileSkills: z.array(profileSkillSchema).optional().nullable(),
  certifications: z.array(profileCertificationSchema).optional().nullable(),
  profileCertifications: z.array(profileCertificationSchema).optional().nullable(),
  portfolio: z.array(profilePortfolioItemSchema).optional().nullable(),
  portfolioItems: z.array(profilePortfolioItemSchema).optional().nullable(),
})

export const resumeDataSchema = z
  .object({
    ResumeID: z.string().optional().nullable(),
    Category: z.string().optional().nullable(),
    Name: z.string().optional().nullable(),
    Email: z.string().optional().nullable(),
    Phone: z.string().optional().nullable(),
    Location: z.string().optional().nullable(),
    Summary: z.string().optional().nullable(),
    Skills: z.string().optional().nullable(),
    Experience: z.string().optional().nullable(),
    Education: z.string().optional().nullable(),
    Text: z.string().optional().nullable(),
    Source: z.string().optional().nullable(),
  })
  .passthrough()

export const importResumeSchema = z.object({
  data: resumeDataSchema,
  sourceFileName: z.string().optional().nullable(),
  schemaVersion: z.string().optional().nullable(),
})

export const userResumeSchema = importResumeSchema.extend({
  id: z.number().optional(),
  userId: z.number().optional(),
  sourceFileUrl: z.string().optional().nullable(),
  sourceFileMimeType: z.string().optional().nullable(),
  sourceFileSize: z.number().optional().nullable(),
  sourceFilePublicId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const updateProfileSchema = userProfileSchema
  .pick({
    name: true,
    phone: true,
    birthDay: true,
    gender: true,
    headline: true,
    bio: true,
    location: true,
    website: true,
  })
  .partial()

export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email').toLowerCase()),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().pipe(z.email('Enter a valid email').toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  birthDay: z.string().optional(),
  gender: z.string().optional(),
  role: z.enum(signupRoles).optional(),
  skill: z.string().optional(),
  certification: z.string().optional(),
})

export const jobTypeSchema = z.object({
  id: z.number(),
  tenLoaiCongViec: z.string(),
})

export const jobDetailTypeSchema = z.object({
  id: z.number(),
  tenChiTiet: z.string(),
  hinhAnh: z.string().optional().nullable(),
  maLoaiCongViec: z.number().optional(),
  loaiCongViec: jobTypeSchema.optional(),
})

export const jobSchema = z.object({
  id: z.number(),
  tenCongViec: z.string(),
  giaTien: z.number(),
  moTaNgan: z.string().optional().nullable(),
  moTa: z.string().optional().nullable(),
  maChiTietLoai: z.number().optional(),
  nguoiTao: z.number().optional(),
  hinhAnh: z.string().optional().nullable(),
  danhGia: z.number().optional().default(0),
  saoCongViec: z.number().optional().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  chiTietLoaiCongViec: jobDetailTypeSchema.optional(),
  nguoiDung: userSchema.pick({ id: true, name: true, avatar: true }).optional(),
})

export const recommendationLabelSchema = z.enum(['high_match', 'medium_match', 'low_match'])

export const candidateDirectoryStatsSchema = z.object({
  portfolioItems: z.coerce.number().default(0),
  certifications: z.coerce.number().default(0),
  completedWork: z.coerce.number().default(0),
  rating: z.coerce.number().default(0),
})

export const candidateDirectoryMatchSchema = z.object({
  score: z.coerce.number().min(0).max(1),
  label: recommendationLabelSchema,
  keywordScore: z.coerce.number().min(0).max(1).default(0),
  skillScore: z.coerce.number().min(0).max(1).default(0),
  locationScore: z.coerce.number().min(0).max(1).default(0),
  qualityScore: z.coerce.number().min(0).max(1).default(0),
})

export const candidateProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  profileSkills: z.array(profileSkillSchema).default([]),
  stats: candidateDirectoryStatsSchema,
  match: candidateDirectoryMatchSchema,
})

export const recommendationScoreSchema = z.object({
  rank: z.coerce.number().int().positive(),
  aiScore: z.coerce.number().min(0).max(1),
  finalScore: z.coerce.number().min(0).max(1),
  label: recommendationLabelSchema,
  skillScore: z.coerce.number().min(0).max(1).optional().default(0),
  seniorityScore: z.coerce.number().min(0).max(1).optional().default(0),
  categoryScore: z.coerce.number().min(0).max(1).optional().default(0),
})

export const recommendedJobSchema = jobSchema.extend({
  recommendation: recommendationScoreSchema,
})

export const recommendedCandidateSchema = userProfileSchema.extend({
  recommendation: recommendationScoreSchema,
})

export const createJobSchema = z.object({
  tenCongViec: z.string().min(3, 'Service title is required'),
  giaTien: z.coerce.number().min(1, 'Price must be greater than zero'),
  moTaNgan: z.string().optional(),
  moTa: z.string().optional(),
  maChiTietLoai: z.coerce.number().min(1, 'Choose a category detail'),
  danhGia: z.coerce.number().default(0),
  saoCongViec: z.coerce.number().min(0).max(5).default(0),
})

export const updateJobSchema = createJobSchema.partial()

export const commentSchema = z.object({
  id: z.number(),
  maCongViec: z.number(),
  maNguoiBinhLuan: z.number().optional(),
  ngayBinhLuan: z.string().optional(),
  noiDung: z.string(),
  saoBinhLuan: z.number(),
  nguoiDung: userSchema.pick({ id: true, name: true, avatar: true }).optional(),
})

export const createCommentSchema = z.object({
  maCongViec: z.number(),
  noiDung: z.string().min(1, 'Comment is required'),
  saoBinhLuan: z.coerce.number().min(1).max(5),
})

export const hiredJobSchema = z.object({
  id: z.number(),
  maCongViec: z.number(),
  maNguoiThue: z.number().optional(),
  ngayThue: z.string().optional(),
  hoanThanh: z.boolean().optional(),
  congViec: jobSchema.optional(),
})

export const feedAuthorSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
})

export const postCommentSchema = z.object({
  id: z.number(),
  postId: z.number(),
  authorId: z.number(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  author: feedAuthorSchema,
})

export const feedPostSchema = z.object({
  id: z.number(),
  content: z.string(),
  imageUrl: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: feedAuthorSchema,
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewerHasLiked: z.boolean(),
  viewerHasSaved: z.boolean(),
  recentComments: z.array(postCommentSchema).default([]),
})

export const feedPageSchema = z.object({
  data: z.array(feedPostSchema).default([]),
  nextCursor: z.string().nullable(),
})

export const connectionProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  profileSkills: z.array(profileSkillSchema).default([]),
})

export const connectionSchema = z.object({
  id: z.number(),
  status: z.enum(['PENDING', 'ACCEPTED']),
  direction: z.enum(['incoming', 'outgoing']).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  user: connectionProfileSchema,
})

export const connectionSuggestionSchema = connectionProfileSchema.extend({
  sharedSkills: z.array(z.string()).default([]),
  sameLocation: z.boolean().default(false),
  suggestionScore: z.number().default(0),
})

export const connectionStatusSchema = z.object({
  state: z.enum(['self', 'none', 'incoming_pending', 'outgoing_pending', 'connected']),
  connectionId: z.number().nullable(),
})

export const chatUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  email: z.string().optional(),
  lastReadAt: z.string().optional().nullable(),
})

export const chatMessageSchema = z.object({
  id: z.number(),
  content: z.string(),
  roomId: z.number(),
  sender: chatUserSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export const chatRoomSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  isGroup: z.boolean(),
  members: z.array(chatUserSchema).default([]),
  lastMessage: chatMessageSchema.nullable().optional(),
  unreadCount: z.number().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const notificationTypes = [
  'CONNECTION_REQUEST',
  'CONNECTION_ACCEPTED',
  'POST_LIKE',
  'POST_COMMENT',
  'HIRE_CREATED',
  'HIRE_COMPLETED',
  'CHAT_MESSAGE',
] as const

export const notificationActorSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
})

export const notificationSchema = z.object({
  id: z.number(),
  recipientId: z.number(),
  actorId: z.number().nullable().optional(),
  type: z.enum(notificationTypes),
  title: z.string(),
  body: z.string(),
  entityType: z.string().optional().nullable(),
  entityId: z.number().optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  readAt: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  actor: notificationActorSchema.optional().nullable(),
})

export type ApiResponse<T> = {
  statusCode?: number
  message?: string | string[]
  content?: T
  dateTime?: string
}
export type PaginatedContent<T> = z.infer<ReturnType<typeof paginatedContentSchema<z.ZodType<T>>>>
export type PaginationParams = z.infer<typeof paginationParamsSchema>
export type User = z.infer<typeof userSchema>
export type ProfileSkill = z.infer<typeof profileSkillSchema>
export type ProfileCertification = z.infer<typeof profileCertificationSchema>
export type ProfilePortfolioItem = z.infer<typeof profilePortfolioItemSchema>
export type UserProfile = z.infer<typeof userProfileSchema>
export type CandidateProfile = z.infer<typeof candidateProfileSchema>
export type ResumeData = z.infer<typeof resumeDataSchema>
export type ImportResume = z.infer<typeof importResumeSchema>
export type UserResume = z.infer<typeof userResumeSchema>
export type UpdateProfile = z.infer<typeof updateProfileSchema>
export type SignIn = z.infer<typeof signInSchema>
export type SignUp = z.infer<typeof signUpSchema>
export type Job = z.infer<typeof jobSchema>
export type RecommendationLabel = z.infer<typeof recommendationLabelSchema>
export type RecommendationScore = z.infer<typeof recommendationScoreSchema>
export type RecommendedJob = z.infer<typeof recommendedJobSchema>
export type RecommendedCandidate = z.infer<typeof recommendedCandidateSchema>
export type RecommendationContent<T> = {
  data: T[]
  model?: string
  elapsedMs?: number
}
export type CandidateDirectoryParams = PaginationParams & {
  skill?: string
  location?: string
}
export type CreateJob = z.infer<typeof createJobSchema>
export type UpdateJob = z.infer<typeof updateJobSchema>
export type JobType = z.infer<typeof jobTypeSchema>
export type JobDetailType = z.infer<typeof jobDetailTypeSchema>
export type Comment = z.infer<typeof commentSchema>
export type CreateComment = z.infer<typeof createCommentSchema>
export type HiredJob = z.infer<typeof hiredJobSchema>
export type FeedAuthor = z.infer<typeof feedAuthorSchema>
export type PostComment = z.infer<typeof postCommentSchema>
export type FeedPost = z.infer<typeof feedPostSchema>
export type FeedPage = z.infer<typeof feedPageSchema>
export type FeedStats = { posts: number; reactions: number }
export type CursorPage<T> = { data: T[]; nextCursor: string | null }
export type ConnectionProfile = z.infer<typeof connectionProfileSchema>
export type Connection = z.infer<typeof connectionSchema>
export type ConnectionSuggestion = z.infer<typeof connectionSuggestionSchema>
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>
export type ConnectionRequests = {
  incoming: Connection[]
  outgoing: Connection[]
  incomingCount: number
}
export type ChatRoom = z.infer<typeof chatRoomSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatUser = z.infer<typeof chatUserSchema>
export type NotificationType = z.infer<typeof notificationSchema>['type']
export type AppNotification = z.infer<typeof notificationSchema>
export type NotificationPage = { data: AppNotification[]; nextCursor: number | null }
