import type {
  ApiResponse,
  AppNotification,
  CandidateProfile,
  Comment,
  CreateComment,
  CreateJob,
  HiredJob,
  FeedAuthor,
  FeedPage,
  FeedPost,
  PostComment,
  Connection,
  ConnectionProfile,
  ConnectionRequests,
  ConnectionSuggestion,
  CursorPage,
  Job,
  JobDetailType,
  JobType,
  NotificationPage,
  PaginatedContent,
  RecommendationContent,
  RecommendationLabel,
  RecommendationScore,
  RecommendedCandidate,
  RecommendedJob,
  UpdateJob,
  UserProfile,
} from '@/shared/schemas'
import { notificationTypes } from '@/shared/schemas'
import { isAccountRole } from '@/shared/lib/roles'

type ApiRecord = Record<string, unknown>

function asRecord(value: unknown): ApiRecord {
  return value && typeof value === 'object' ? (value as ApiRecord) : {}
}

function pickString(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string') return value
  }
  return undefined
}

function pickNumber(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number') return value
  }
  return undefined
}

function pickStringArray(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }
  }
  return []
}

function pickBoolean(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
  }
  return undefined
}

function pickRole(record: ApiRecord) {
  const role = pickString(record, 'role')
  return isAccountRole(role) ? role : 'user'
}

function pickUser(record: ApiRecord, ...keys: string[]): Job['nguoiDung'] | undefined {
  for (const key of keys) {
    const value = record[key]
    if (value && typeof value === 'object') return value as Job['nguoiDung']
  }
  return undefined
}

function normalizeFeedAuthor(raw: unknown): FeedAuthor {
  const record = asRecord(raw)
  return {
    id: pickNumber(record, 'id') ?? 0,
    name: pickString(record, 'name') ?? 'JobAura member',
    avatar: pickString(record, 'avatar') ?? null,
    headline: pickString(record, 'headline') ?? null,
  }
}

const notificationTypeSet = new Set<string>(notificationTypes)

function pickNotificationType(record: ApiRecord): AppNotification['type'] {
  const type = pickString(record, 'type')
  return type && notificationTypeSet.has(type) ? (type as AppNotification['type']) : 'CHAT_MESSAGE'
}

function normalizeNotificationActor(raw: unknown): AppNotification['actor'] {
  if (!raw || typeof raw !== 'object') return null
  const record = asRecord(raw)
  return {
    id: pickNumber(record, 'id') ?? 0,
    name: pickString(record, 'name') ?? 'JobAura member',
    avatar: pickString(record, 'avatar') ?? null,
    headline: pickString(record, 'headline') ?? null,
  }
}

export function normalizeNotification(raw: unknown): AppNotification {
  const record = asRecord(raw)
  const metadata = record.metadata && typeof record.metadata === 'object'
    ? (record.metadata as Record<string, unknown>)
    : null
  return {
    id: pickNumber(record, 'id') ?? 0,
    recipientId: pickNumber(record, 'recipientId') ?? 0,
    actorId: pickNumber(record, 'actorId') ?? null,
    type: pickNotificationType(record),
    title: pickString(record, 'title') ?? 'Notification',
    body: pickString(record, 'body') ?? '',
    entityType: pickString(record, 'entityType') ?? null,
    entityId: pickNumber(record, 'entityId') ?? null,
    actionUrl: pickString(record, 'actionUrl') ?? null,
    metadata,
    readAt: pickString(record, 'readAt') ?? null,
    createdAt: pickString(record, 'createdAt') ?? '',
    updatedAt: pickString(record, 'updatedAt'),
    actor: normalizeNotificationActor(record.actor),
  }
}

export function normalizeNotificationsResponse(response: ApiResponse<NotificationPage>): ApiResponse<NotificationPage> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    return {
      data: Array.isArray(record.data) ? record.data.map(normalizeNotification) : [],
      nextCursor: pickNumber(record, 'nextCursor') ?? null,
    }
  })
}

export function normalizePostComment(raw: unknown): PostComment {
  const record = asRecord(raw)
  return {
    id: pickNumber(record, 'id') ?? 0,
    postId: pickNumber(record, 'postId') ?? 0,
    authorId: pickNumber(record, 'authorId') ?? 0,
    content: pickString(record, 'content') ?? '',
    createdAt: pickString(record, 'createdAt') ?? '',
    updatedAt: pickString(record, 'updatedAt'),
    author: normalizeFeedAuthor(record.author),
  }
}

export function normalizeFeedPost(raw: unknown): FeedPost {
  const record = asRecord(raw)
  return {
    id: pickNumber(record, 'id') ?? 0,
    content: pickString(record, 'content') ?? '',
    imageUrl: pickString(record, 'imageUrl') ?? null,
    createdAt: pickString(record, 'createdAt') ?? '',
    updatedAt: pickString(record, 'updatedAt') ?? '',
    author: normalizeFeedAuthor(record.author),
    likeCount: pickNumber(record, 'likeCount') ?? 0,
    commentCount: pickNumber(record, 'commentCount') ?? 0,
    viewerHasLiked: pickBoolean(record, 'viewerHasLiked') ?? false,
    viewerHasSaved: pickBoolean(record, 'viewerHasSaved') ?? false,
    recentComments: Array.isArray(record.recentComments)
      ? record.recentComments.map(normalizePostComment)
      : [],
  }
}

export function normalizeFeedResponse(response: ApiResponse<FeedPage>): ApiResponse<FeedPage> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    return {
      data: Array.isArray(record.data) ? record.data.map(normalizeFeedPost) : [],
      nextCursor: pickString(record, 'nextCursor') ?? null,
    }
  })
}

export function normalizeSavedJobsResponse(
  response: ApiResponse<CursorPage<Job>>
): ApiResponse<CursorPage<Job>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    return {
      data: Array.isArray(record.data) ? record.data.map(normalizeJob) : [],
      nextCursor: pickString(record, 'nextCursor') ?? null,
    }
  })
}

export function normalizeCursorJobsResponse(
  response: ApiResponse<CursorPage<Job>>
): ApiResponse<CursorPage<Job>> {
  return normalizeSavedJobsResponse(response)
}

function normalizeConnectionProfile(raw: unknown): ConnectionProfile {
  const record = asRecord(raw)
  const skills = Array.isArray(record.profileSkills)
    ? record.profileSkills.map((item) => {
        const skill = asRecord(item)
        return {
          id: pickNumber(skill, 'id'),
          name: pickString(skill, 'name') ?? '',
          level: pickString(skill, 'level') ?? null,
          sortOrder: pickNumber(skill, 'sortOrder'),
        }
      }).filter((skill) => skill.name)
    : []
  return {
    id: pickNumber(record, 'id') ?? 0,
    name: pickString(record, 'name') ?? 'JobAura member',
    avatar: pickString(record, 'avatar') ?? null,
    headline: pickString(record, 'headline') ?? null,
    bio: pickString(record, 'bio') ?? null,
    location: pickString(record, 'location') ?? null,
    profileSkills: skills,
  }
}

function normalizeConnection(raw: unknown): Connection {
  const record = asRecord(raw)
  const direction = pickString(record, 'direction')
  return {
    id: pickNumber(record, 'id') ?? 0,
    status: pickString(record, 'status') === 'PENDING' ? 'PENDING' : 'ACCEPTED',
    direction: direction === 'incoming' || direction === 'outgoing' ? direction : undefined,
    createdAt: pickString(record, 'createdAt'),
    updatedAt: pickString(record, 'updatedAt'),
    user: normalizeConnectionProfile(record.user),
  }
}

export function normalizeConnectionsResponse(
  response: ApiResponse<PaginatedContent<Connection>>
): ApiResponse<PaginatedContent<Connection>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    return {
      ...content,
      data: Array.isArray(record.data) ? record.data.map(normalizeConnection) : [],
      pageIndex: pickNumber(record, 'pageIndex', 'page'),
      pageSize: pickNumber(record, 'pageSize'),
      totalRow: pickNumber(record, 'totalRow', 'total'),
      totalPages: pickNumber(record, 'totalPages'),
    }
  })
}

export function normalizeConnectionRequestsResponse(
  response: ApiResponse<ConnectionRequests>
): ApiResponse<ConnectionRequests> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    return {
      incoming: Array.isArray(record.incoming) ? record.incoming.map(normalizeConnection) : [],
      outgoing: Array.isArray(record.outgoing) ? record.outgoing.map(normalizeConnection) : [],
      incomingCount: pickNumber(record, 'incomingCount') ?? 0,
    }
  })
}

export function normalizeConnectionSuggestionsResponse(
  response: ApiResponse<PaginatedContent<ConnectionSuggestion>>
): ApiResponse<PaginatedContent<ConnectionSuggestion>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    const data = Array.isArray(record.data) ? record.data.map((item) => {
      const itemRecord = asRecord(item)
      return {
        ...normalizeConnectionProfile(item),
        sharedSkills: Array.isArray(itemRecord.sharedSkills)
          ? itemRecord.sharedSkills.filter((skill): skill is string => typeof skill === 'string')
          : [],
        sameLocation: pickBoolean(itemRecord, 'sameLocation') ?? false,
        suggestionScore: pickNumber(itemRecord, 'suggestionScore') ?? 0,
      }
    }) : []
    return {
      ...content,
      data,
      pageIndex: pickNumber(record, 'pageIndex', 'page'),
      pageSize: pickNumber(record, 'pageSize'),
      totalRow: pickNumber(record, 'totalRow', 'total'),
      totalPages: pickNumber(record, 'totalPages'),
    }
  })
}

function mapApiResponse<T, U>(response: ApiResponse<T>, mapper: (content: T) => U): ApiResponse<U> {
  const { content, ...meta } = response
  return content === undefined ? meta : { ...meta, content: mapper(content) }
}

export function normalizeCategory(raw: unknown): JobType {
  const record = asRecord(raw)
  return {
    ...(record as Partial<JobType>),
    id: pickNumber(record, 'id') ?? 0,
    tenLoaiCongViec: pickString(record, 'tenLoaiCongViec', 'name') ?? '',
    subcategories: Array.isArray(record.subcategories) ? record.subcategories.map(normalizeSubcategory) : undefined,
  }
}

export function normalizeSubcategory(raw: unknown): JobDetailType {
  const record = asRecord(raw)
  return {
    ...(record as Partial<JobDetailType>),
    id: pickNumber(record, 'id') ?? 0,
    tenChiTiet: pickString(record, 'tenChiTiet', 'name') ?? '',
    hinhAnh: pickString(record, 'hinhAnh', 'image') ?? null,
    maLoaiCongViec: pickNumber(record, 'maLoaiCongViec', 'categoryId'),
    loaiCongViec: record.loaiCongViec ? normalizeCategory(record.loaiCongViec) : record.category ? normalizeCategory(record.category) : undefined,
  }
}

export function normalizeJob(raw: unknown): Job {
  const record = asRecord(raw)
  return {
    ...(record as Partial<Job>),
    id: pickNumber(record, 'id') ?? 0,
    tenCongViec: pickString(record, 'tenCongViec', 'title') ?? '',
    giaTien: pickNumber(record, 'giaTien', 'price') ?? 0,
    moTaNgan: pickString(record, 'moTaNgan', 'shortDescription') ?? null,
    moTa: pickString(record, 'moTa', 'description') ?? null,
    maChiTietLoai: pickNumber(record, 'maChiTietLoai', 'subcategoryId'),
    nguoiTao: pickNumber(record, 'nguoiTao', 'creatorId', 'userId', 'ownerId', 'createdById', 'authorId', 'sellerId'),
    hinhAnh: pickString(record, 'hinhAnh', 'image') ?? null,
    danhGia: pickNumber(record, 'danhGia', 'reviews') ?? 0,
    saoCongViec: pickNumber(record, 'saoCongViec', 'rating') ?? 0,
    createdAt: pickString(record, 'createdAt'),
    updatedAt: pickString(record, 'updatedAt'),
    chiTietLoaiCongViec: record.chiTietLoaiCongViec
      ? normalizeSubcategory(record.chiTietLoaiCongViec)
      : record.subcategory
        ? normalizeSubcategory(record.subcategory)
        : undefined,
    nguoiDung: pickUser(record, 'nguoiDung', 'user', 'creator', 'owner', 'seller'),
  }
}

export function normalizeRecommendationScore(raw: unknown): RecommendationScore {
  const record = asRecord(raw)
  const label = pickString(record, 'label', 'matchLabel')
  const validLabel: RecommendationLabel =
    label === 'high_match' || label === 'medium_match' || label === 'low_match' ? label : 'low_match'

  return {
    rank: pickNumber(record, 'rank') ?? 0,
    aiScore: pickNumber(record, 'aiScore', 'score') ?? 0,
    finalScore: pickNumber(record, 'finalScore', 'final_score') ?? pickNumber(record, 'aiScore', 'score') ?? 0,
    label: validLabel,
    skillScore: pickNumber(record, 'skillScore', 'skill_score') ?? 0,
    seniorityScore: pickNumber(record, 'seniorityScore', 'seniority_score') ?? 0,
    categoryScore: pickNumber(record, 'categoryScore', 'category_score') ?? 0,
    requiredSkills: pickStringArray(record, 'requiredSkills', 'required_skills'),
    matchedSkills: pickStringArray(record, 'matchedSkills', 'matched_skills'),
    missingSkills: pickStringArray(record, 'missingSkills', 'missing_skills'),
    improvementTips: pickStringArray(record, 'improvementTips', 'improvement_tips'),
  }
}

export function normalizeRecommendationQuota(raw: unknown) {
  const record = asRecord(raw)
  return {
    limit: pickNumber(record, 'limit') ?? 0,
    used: pickNumber(record, 'used') ?? 0,
    remaining: pickNumber(record, 'remaining') ?? 0,
    resetAt: pickString(record, 'resetAt') ?? '',
  }
}

export function normalizeRecommendedJob(raw: unknown): RecommendedJob {
  const record = asRecord(raw)
  return {
    ...normalizeJob(raw),
    recommendation: normalizeRecommendationScore(record.recommendation),
  }
}

export function normalizeRecommendedCandidate(raw: unknown): RecommendedCandidate {
  const record = asRecord(raw)
  const profileSkills = Array.isArray(record.profileSkills)
    ? record.profileSkills
    : Array.isArray(record.skills)
      ? record.skills
      : undefined

  return {
    ...(record as Partial<UserProfile>),
    id: pickNumber(record, 'id') ?? 0,
    name: pickString(record, 'name') ?? '',
    email: pickString(record, 'email') ?? '',
    avatar: pickString(record, 'avatar') ?? null,
    phone: pickString(record, 'phone'),
    birthDay: pickString(record, 'birthDay'),
    gender: pickString(record, 'gender'),
    role: pickRole(record),
    skill: pickString(record, 'skill') ?? null,
    certification: pickString(record, 'certification') ?? null,
    headline: pickString(record, 'headline') ?? null,
    bio: pickString(record, 'bio') ?? null,
    location: pickString(record, 'location') ?? null,
    profileSkills: profileSkills as RecommendedCandidate['profileSkills'],
    skills: profileSkills as RecommendedCandidate['skills'],
    recommendation: normalizeRecommendationScore(record.recommendation),
  }
}

export function normalizeCandidateProfile(raw: unknown): CandidateProfile {
  const record = asRecord(raw)
  const profileSkills = Array.isArray(record.profileSkills)
    ? record.profileSkills.map((skill) => {
        const skillRecord = asRecord(skill)
        return {
          id: pickNumber(skillRecord, 'id'),
          name: pickString(skillRecord, 'name') ?? '',
          level: pickString(skillRecord, 'level') ?? null,
          sortOrder: pickNumber(skillRecord, 'sortOrder'),
        }
      }).filter((skill) => skill.name)
    : []
  const statsRecord = asRecord(record.stats)
  const matchRecord = asRecord(record.match)
  const label = pickString(matchRecord, 'label')
  const validLabel: CandidateProfile['match']['label'] =
    label === 'high_match' || label === 'medium_match' || label === 'low_match' ? label : 'low_match'

  return {
    id: pickNumber(record, 'id') ?? 0,
    name: pickString(record, 'name') ?? '',
    avatar: pickString(record, 'avatar') ?? null,
    headline: pickString(record, 'headline') ?? null,
    bio: pickString(record, 'bio') ?? null,
    location: pickString(record, 'location') ?? null,
    profileSkills,
    stats: {
      portfolioItems: pickNumber(statsRecord, 'portfolioItems') ?? 0,
      certifications: pickNumber(statsRecord, 'certifications') ?? 0,
      completedWork: pickNumber(statsRecord, 'completedWork') ?? 0,
      rating: pickNumber(statsRecord, 'rating') ?? 0,
    },
    match: {
      score: pickNumber(matchRecord, 'score') ?? 0,
      label: validLabel,
      keywordScore: pickNumber(matchRecord, 'keywordScore') ?? 0,
      skillScore: pickNumber(matchRecord, 'skillScore') ?? 0,
      locationScore: pickNumber(matchRecord, 'locationScore') ?? 0,
      qualityScore: pickNumber(matchRecord, 'qualityScore') ?? 0,
    },
  }
}

export function normalizeComment(raw: unknown): Comment {
  const record = asRecord(raw)
  const user = pickUser(record, 'nguoiDung', 'user', 'commenter', 'author', 'createdBy')
  return {
    ...(record as Partial<Comment>),
    id: pickNumber(record, 'id') ?? 0,
    maCongViec: pickNumber(record, 'maCongViec', 'jobId') ?? 0,
    maNguoiBinhLuan: pickNumber(record, 'maNguoiBinhLuan', 'userId', 'commenterId', 'authorId', 'createdById') ?? user?.id,
    ngayBinhLuan: pickString(record, 'ngayBinhLuan', 'createdAt', 'commentedAt'),
    noiDung: pickString(record, 'noiDung', 'content', 'comment') ?? '',
    saoBinhLuan: pickNumber(record, 'saoBinhLuan', 'rating') ?? 0,
    nguoiDung: user,
  }
}

export function normalizeHiredJob(raw: unknown): HiredJob {
  const record = asRecord(raw)
  return {
    ...(record as Partial<HiredJob>),
    id: pickNumber(record, 'id') ?? 0,
    maCongViec: pickNumber(record, 'maCongViec', 'jobId') ?? 0,
    maNguoiThue: pickNumber(record, 'maNguoiThue', 'userId', 'hirerId'),
    ngayThue: pickString(record, 'ngayThue', 'createdAt'),
    hoanThanh: pickBoolean(record, 'hoanThanh', 'completed'),
    congViec: record.congViec ? normalizeJob(record.congViec) : record.job ? normalizeJob(record.job) : undefined,
  }
}

export function normalizePaginatedJobsResponse(response: ApiResponse<PaginatedContent<Job>>): ApiResponse<PaginatedContent<Job>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    const data = Array.isArray(record.data) ? record.data.map(normalizeJob) : []
    return {
      ...content,
      data,
      pageIndex: pickNumber(record, 'pageIndex', 'page'),
      pageSize: pickNumber(record, 'pageSize'),
      totalRow: pickNumber(record, 'totalRow', 'total'),
      totalPages: pickNumber(record, 'totalPages'),
    }
  })
}

export function normalizePaginatedCandidatesResponse(
  response: ApiResponse<PaginatedContent<CandidateProfile>>
): ApiResponse<PaginatedContent<CandidateProfile>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    const data = Array.isArray(record.data) ? record.data.map(normalizeCandidateProfile) : []
    return {
      ...content,
      data,
      pageIndex: pickNumber(record, 'pageIndex', 'page'),
      pageSize: pickNumber(record, 'pageSize'),
      totalRow: pickNumber(record, 'totalRow', 'total'),
      totalPages: pickNumber(record, 'totalPages'),
    }
  })
}

export function normalizeJobsResponse(response: ApiResponse<Job[]>): ApiResponse<Job[]> {
  return mapApiResponse(response, (content) => content.map(normalizeJob))
}

export function normalizeRecommendedJobsResponse(
  response: ApiResponse<RecommendationContent<RecommendedJob>>
): ApiResponse<RecommendationContent<RecommendedJob>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    const data = Array.isArray(record.data) ? record.data.map(normalizeRecommendedJob) : []

    return {
      ...content,
      data,
      model: pickString(record, 'model'),
      elapsedMs: pickNumber(record, 'elapsedMs', 'elapsed_ms'),
      quota: record.quota ? normalizeRecommendationQuota(record.quota) : undefined,
    }
  })
}

export function normalizeRecommendedCandidatesResponse(
  response: ApiResponse<RecommendationContent<RecommendedCandidate>>
): ApiResponse<RecommendationContent<RecommendedCandidate>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    const data = Array.isArray(record.data) ? record.data.map(normalizeRecommendedCandidate) : []

    return {
      ...content,
      data,
      model: pickString(record, 'model'),
      elapsedMs: pickNumber(record, 'elapsedMs', 'elapsed_ms'),
      quota: record.quota ? normalizeRecommendationQuota(record.quota) : undefined,
    }
  })
}

export function normalizeJobResponse<T extends Job & { binhLuans?: Comment[]; comments?: Comment[] }>(response: ApiResponse<T>): ApiResponse<Job & { binhLuans?: Comment[] }> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content)
    const comments = Array.isArray(record.binhLuans)
      ? record.binhLuans.map(normalizeComment)
      : Array.isArray(record.comments)
        ? record.comments.map(normalizeComment)
        : undefined
    return { ...normalizeJob(content), binhLuans: comments }
  })
}

export function normalizeCategoriesResponse(response: ApiResponse<JobType[]>): ApiResponse<JobType[]> {
  return mapApiResponse(response, (content) => content.map(normalizeCategory))
}

export function normalizeSubcategoriesResponse(response: ApiResponse<JobDetailType[]>): ApiResponse<JobDetailType[]> {
  return mapApiResponse(response, (content) => content.map(normalizeSubcategory))
}

export function normalizeCommentsResponse(response: ApiResponse<Comment[]>): ApiResponse<Comment[]> {
  return mapApiResponse(response, (content) => content.map(normalizeComment))
}

export function normalizeHiredJobsResponse(response: ApiResponse<HiredJob[]>): ApiResponse<HiredJob[]> {
  return mapApiResponse(response, (content) => content.map(normalizeHiredJob))
}

export function toJobPayload(data: CreateJob | UpdateJob) {
  return {
    title: data.tenCongViec,
    price: data.giaTien,
    shortDescription: data.moTaNgan,
    description: data.moTa,
    subcategoryId: data.maChiTietLoai,
    reviews: data.danhGia,
    rating: data.saoCongViec,
  }
}

export function toCategoryPayload(data: Pick<JobType, 'tenLoaiCongViec'> | Partial<Pick<JobType, 'tenLoaiCongViec'>>) {
  return { name: data.tenLoaiCongViec }
}

export function toSubcategoryPayload(data: Partial<JobDetailType>) {
  return {
    name: data.tenChiTiet,
    image: data.hinhAnh,
    categoryId: data.maLoaiCongViec,
  }
}

export function toCommentPayload(data: CreateComment) {
  return {
    jobId: data.maCongViec,
    content: data.noiDung,
    rating: data.saoBinhLuan,
  }
}
