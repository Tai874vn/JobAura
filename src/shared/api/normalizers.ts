import type {
  ApiResponse,
  Comment,
  CreateComment,
  CreateJob,
  HiredJob,
  Job,
  JobDetailType,
  JobType,
  PaginatedContent,
  RecommendationContent,
  RecommendationLabel,
  RecommendationScore,
  RecommendedCandidate,
  RecommendedJob,
  UpdateJob,
  UserProfile,
} from '@/shared/schemas'

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

function pickBoolean(record: ApiRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'boolean') return value
  }
  return undefined
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
    nguoiTao: pickNumber(record, 'nguoiTao', 'creatorId'),
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
    nguoiDung: record.nguoiDung && typeof record.nguoiDung === 'object' ? (record.nguoiDung as Job['nguoiDung']) : undefined,
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
    role: pickString(record, 'role'),
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

export function normalizeComment(raw: unknown): Comment {
  const record = asRecord(raw)
  return {
    ...(record as Partial<Comment>),
    id: pickNumber(record, 'id') ?? 0,
    maCongViec: pickNumber(record, 'maCongViec', 'jobId') ?? 0,
    maNguoiBinhLuan: pickNumber(record, 'maNguoiBinhLuan', 'userId'),
    ngayBinhLuan: pickString(record, 'ngayBinhLuan', 'createdAt'),
    noiDung: pickString(record, 'noiDung', 'content', 'comment') ?? '',
    saoBinhLuan: pickNumber(record, 'saoBinhLuan', 'rating') ?? 0,
    nguoiDung: record.nguoiDung && typeof record.nguoiDung === 'object' ? (record.nguoiDung as Comment['nguoiDung']) : undefined,
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
