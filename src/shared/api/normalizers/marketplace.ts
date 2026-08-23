import type {
  ApiResponse, CandidateProfile, Comment, CreateComment, CreateJob, HiredJob, HiringApplication, HiringPost,
  Job, JobDetailType, JobType, PaginatedContent, RecommendationContent, RecommendationLabel, RecommendationScore,
  RecommendedCandidate, RecommendedJob, UpdateJob, UserProfile,
} from '@/shared/schemas'
import { asRecord, mapApiResponse, pickBoolean, pickNumber, pickRole, pickString, pickStringArray, pickUser } from './core'

export function normalizeCategory(raw: unknown): JobType {
  const record = asRecord(raw);
  return {
    ...(record as Partial<JobType>),
    id: pickNumber(record, "id") ?? 0,
    tenLoaiCongViec: pickString(record, "tenLoaiCongViec", "name") ?? "",
    subcategories: Array.isArray(record.subcategories)
      ? record.subcategories.map(normalizeSubcategory)
      : undefined,
  };
}

export function normalizeSubcategory(raw: unknown): JobDetailType {
  const record = asRecord(raw);
  return {
    ...(record as Partial<JobDetailType>),
    id: pickNumber(record, "id") ?? 0,
    tenChiTiet: pickString(record, "tenChiTiet", "name") ?? "",
    hinhAnh: pickString(record, "hinhAnh", "image") ?? null,
    maLoaiCongViec: pickNumber(record, "maLoaiCongViec", "categoryId"),
    loaiCongViec: record.loaiCongViec
      ? normalizeCategory(record.loaiCongViec)
      : record.category
        ? normalizeCategory(record.category)
        : undefined,
  };
}

export function normalizeJob(raw: unknown): Job {
  const record = asRecord(raw);
  return {
    ...(record as Partial<Job>),
    id: pickNumber(record, "id") ?? 0,
    tenCongViec: pickString(record, "tenCongViec", "title") ?? "",
    giaTien: pickNumber(record, "giaTien", "price") ?? 0,
    moTaNgan: pickString(record, "moTaNgan", "shortDescription") ?? null,
    moTa: pickString(record, "moTa", "description") ?? null,
    maChiTietLoai: pickNumber(record, "maChiTietLoai", "subcategoryId"),
    nguoiTao: pickNumber(
      record,
      "nguoiTao",
      "creatorId",
      "userId",
      "ownerId",
      "createdById",
      "authorId",
      "sellerId",
    ),
    hinhAnh: pickString(record, "hinhAnh", "image") ?? null,
    danhGia: pickNumber(record, "danhGia", "reviews") ?? 0,
    saoCongViec: pickNumber(record, "saoCongViec", "rating") ?? 0,
    createdAt: pickString(record, "createdAt"),
    updatedAt: pickString(record, "updatedAt"),
    chiTietLoaiCongViec: record.chiTietLoaiCongViec
      ? normalizeSubcategory(record.chiTietLoaiCongViec)
      : record.subcategory
        ? normalizeSubcategory(record.subcategory)
        : undefined,
    nguoiDung: pickUser(
      record,
      "nguoiDung",
      "user",
      "creator",
      "owner",
      "seller",
    ),
  };
}

export function normalizeHiringPost(raw: unknown): HiringPost {
  const record = asRecord(raw);
  const status = pickString(record, "status");
  const recruiter =
    record.recruiter && typeof record.recruiter === "object"
      ? asRecord(record.recruiter)
      : null;
  return {
    id: pickNumber(record, "id") ?? 0,
    recruiterId: pickNumber(record, "recruiterId") ?? 0,
    title: pickString(record, "title") ?? "",
    description: pickString(record, "description") ?? "",
    requirements: pickString(record, "requirements") ?? null,
    location: pickString(record, "location") ?? null,
    employmentType: pickString(record, "employmentType") ?? null,
    salaryMin: pickNumber(record, "salaryMin") ?? null,
    salaryMax: pickNumber(record, "salaryMax") ?? null,
    predictedSeniority: pickString(record, "predictedSeniority") ?? null,
    predictedSeniorityConfidence:
      pickNumber(record, "predictedSeniorityConfidence") ?? null,
    predictedSeniorityModel: pickString(record, "predictedSeniorityModel") ?? null,
    predictedSeniorityAt: pickString(record, "predictedSeniorityAt") ?? null,
    status: status === "CLOSED" ? "CLOSED" : "OPEN",
    createdAt: pickString(record, "createdAt"),
    updatedAt: pickString(record, "updatedAt"),
    recruiter: recruiter
      ? {
          id: pickNumber(recruiter, "id") ?? 0,
          name: pickString(recruiter, "name") ?? "Recruiter",
          avatar: pickString(recruiter, "avatar") ?? null,
          headline: pickString(recruiter, "headline") ?? null,
        }
      : undefined,
    applicationCount: pickNumber(record, "applicationCount") ?? 0,
    viewerHasApplied: pickBoolean(record, "viewerHasApplied") ?? false,
  };
}

export function normalizeHiringApplication(raw: unknown): HiringApplication {
  const record = asRecord(raw);
  const status = pickString(record, "status");
  const applicantRecord =
    record.applicant && typeof record.applicant === "object"
      ? asRecord(record.applicant)
      : null;
  return {
    id: pickNumber(record, "id") ?? 0,
    hiringPostId: pickNumber(record, "hiringPostId") ?? 0,
    applicantId: pickNumber(record, "applicantId") ?? 0,
    coverLetter: pickString(record, "coverLetter") ?? null,
    status:
      status === "REVIEWING" ||
      status === "ACCEPTED" ||
      status === "REJECTED" ||
      status === "WITHDRAWN"
        ? status
        : "APPLIED",
    createdAt: pickString(record, "createdAt"),
    updatedAt: pickString(record, "updatedAt"),
    hiringPost: record.hiringPost
      ? normalizeHiringPost(record.hiringPost)
      : undefined,
    applicant: applicantRecord
      ? {
          id: pickNumber(applicantRecord, "id") ?? 0,
          name: pickString(applicantRecord, "name") ?? "Candidate",
          email: pickString(applicantRecord, "email") ?? "",
          avatar: pickString(applicantRecord, "avatar") ?? null,
          headline: pickString(applicantRecord, "headline") ?? null,
          bio: pickString(applicantRecord, "bio") ?? null,
          location: pickString(applicantRecord, "location") ?? null,
          role: pickRole(applicantRecord),
          profileSkills: Array.isArray(applicantRecord.profileSkills)
            ? applicantRecord.profileSkills
                .map((skill) => {
                  const skillRecord = asRecord(skill);
                  return {
                    id: pickNumber(skillRecord, "id"),
                    name: pickString(skillRecord, "name") ?? "",
                    level: pickString(skillRecord, "level") ?? null,
                    sortOrder: pickNumber(skillRecord, "sortOrder"),
                  };
                })
                .filter((skill) => skill.name)
            : [],
        }
      : undefined,
  };
}

export function normalizeRecommendationScore(
  raw: unknown,
): RecommendationScore {
  const record = asRecord(raw);
  const label = pickString(record, "label", "matchLabel");
  const rawDecision = pickString(record, "decision", "matchLabel");
  const decision =
    rawDecision === "match" || rawDecision === "no_match"
      ? rawDecision
      : undefined;
  const source = pickString(record, "source");
  const validLabel: RecommendationLabel =
    label === "high_match" || label === "medium_match" || label === "low_match"
      ? label
      : "low_match";

  return {
    rank: pickNumber(record, "rank") ?? 0,
    aiScore: pickNumber(record, "aiScore", "score") ?? 0,
    finalScore:
      pickNumber(record, "finalScore", "final_score") ??
      pickNumber(record, "aiScore", "score") ??
      0,
    label: validLabel,
    isMatch: pickBoolean(record, "isMatch"),
    matchLabel: decision,
    decision,
    threshold: pickNumber(record, "threshold"),
    source:
      source === "classifier" || source === "embedding_rerank"
        ? source
        : undefined,
    skillScore: pickNumber(record, "skillScore", "skill_score") ?? 0,
    seniorityScore:
      pickNumber(record, "seniorityScore", "seniority_score") ?? 0,
    categoryScore: pickNumber(record, "categoryScore", "category_score") ?? 0,
    requiredSkills: pickStringArray(
      record,
      "requiredSkills",
      "required_skills",
    ),
    matchedSkills: pickStringArray(record, "matchedSkills", "matched_skills"),
    missingSkills: pickStringArray(record, "missingSkills", "missing_skills"),
    improvementTips: pickStringArray(
      record,
      "improvementTips",
      "improvement_tips",
    ),
  };
}

export function normalizeRecommendationQuota(raw: unknown) {
  const record = asRecord(raw);
  return {
    limit: pickNumber(record, "limit") ?? 0,
    used: pickNumber(record, "used") ?? 0,
    remaining: pickNumber(record, "remaining") ?? 0,
    resetAt: pickString(record, "resetAt") ?? "",
  };
}

function normalizeRecommendationCache(
  raw: unknown,
): RecommendationContent<unknown>["cache"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const record = asRecord(raw);
  const source = pickString(record, "source");
  return {
    hit: pickBoolean(record, "hit") ?? false,
    ttlSeconds: pickNumber(record, "ttlSeconds", "ttl_seconds") ?? 0,
    source: source === "redis" || source === "database" ? source : undefined,
  };
}

export function normalizeRecommendedJob(raw: unknown): RecommendedJob {
  const record = asRecord(raw);
  return {
    ...normalizeJob(raw),
    recommendation: normalizeRecommendationScore(record.recommendation),
  };
}

export function normalizeRecommendedCandidate(
  raw: unknown,
): RecommendedCandidate {
  const record = asRecord(raw);
  const profileSkills = Array.isArray(record.profileSkills)
    ? record.profileSkills
    : Array.isArray(record.skills)
      ? record.skills
      : undefined;

  return {
    ...(record as Partial<UserProfile>),
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "",
    email: pickString(record, "email") ?? "",
    avatar: pickString(record, "avatar") ?? null,
    phone: pickString(record, "phone"),
    birthDay: pickString(record, "birthDay"),
    gender: pickString(record, "gender"),
    role: pickRole(record),
    skill: pickString(record, "skill") ?? null,
    certification: pickString(record, "certification") ?? null,
    headline: pickString(record, "headline") ?? null,
    bio: pickString(record, "bio") ?? null,
    location: pickString(record, "location") ?? null,
    profileSkills: profileSkills as RecommendedCandidate["profileSkills"],
    skills: profileSkills as RecommendedCandidate["skills"],
    recommendation: normalizeRecommendationScore(record.recommendation),
  };
}

export function normalizeCandidateProfile(raw: unknown): CandidateProfile {
  const record = asRecord(raw);
  const profileSkills = Array.isArray(record.profileSkills)
    ? record.profileSkills
        .map((skill) => {
          const skillRecord = asRecord(skill);
          return {
            id: pickNumber(skillRecord, "id"),
            name: pickString(skillRecord, "name") ?? "",
            level: pickString(skillRecord, "level") ?? null,
            sortOrder: pickNumber(skillRecord, "sortOrder"),
          };
        })
        .filter((skill) => skill.name)
    : [];
  const statsRecord = asRecord(record.stats);
  const matchRecord = asRecord(record.match);
  const label = pickString(matchRecord, "label");
  const validLabel: CandidateProfile["match"]["label"] =
    label === "high_match" || label === "medium_match" || label === "low_match"
      ? label
      : "low_match";

  return {
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "",
    avatar: pickString(record, "avatar") ?? null,
    headline: pickString(record, "headline") ?? null,
    bio: pickString(record, "bio") ?? null,
    location: pickString(record, "location") ?? null,
    profileSkills,
    stats: {
      portfolioItems: pickNumber(statsRecord, "portfolioItems") ?? 0,
      certifications: pickNumber(statsRecord, "certifications") ?? 0,
      completedWork: pickNumber(statsRecord, "completedWork") ?? 0,
      rating: pickNumber(statsRecord, "rating") ?? 0,
    },
    match: {
      score: pickNumber(matchRecord, "score") ?? 0,
      label: validLabel,
      keywordScore: pickNumber(matchRecord, "keywordScore") ?? 0,
      skillScore: pickNumber(matchRecord, "skillScore") ?? 0,
      locationScore: pickNumber(matchRecord, "locationScore") ?? 0,
      qualityScore: pickNumber(matchRecord, "qualityScore") ?? 0,
    },
  };
}

export function normalizeComment(raw: unknown): Comment {
  const record = asRecord(raw);
  const user = pickUser(
    record,
    "nguoiDung",
    "user",
    "commenter",
    "author",
    "createdBy",
  );
  return {
    ...(record as Partial<Comment>),
    id: pickNumber(record, "id") ?? 0,
    maCongViec: pickNumber(record, "maCongViec", "jobId") ?? 0,
    maNguoiBinhLuan:
      pickNumber(
        record,
        "maNguoiBinhLuan",
        "userId",
        "commenterId",
        "authorId",
        "createdById",
      ) ?? user?.id,
    ngayBinhLuan: pickString(
      record,
      "ngayBinhLuan",
      "createdAt",
      "commentedAt",
    ),
    noiDung: pickString(record, "noiDung", "content", "comment") ?? "",
    saoBinhLuan: pickNumber(record, "saoBinhLuan", "rating") ?? 0,
    nguoiDung: user,
  };
}

export function normalizeHiredJob(raw: unknown): HiredJob {
  const record = asRecord(raw);
  return {
    ...(record as Partial<HiredJob>),
    id: pickNumber(record, "id") ?? 0,
    maCongViec: pickNumber(record, "maCongViec", "jobId") ?? 0,
    maNguoiThue: pickNumber(record, "maNguoiThue", "userId", "hirerId"),
    ngayThue: pickString(record, "ngayThue", "createdAt"),
    hoanThanh: pickBoolean(record, "hoanThanh", "completed"),
    congViec: record.congViec
      ? normalizeJob(record.congViec)
      : record.job
        ? normalizeJob(record.job)
        : undefined,
  };
}

export function normalizePaginatedJobsResponse(
  response: ApiResponse<PaginatedContent<Job>>,
): ApiResponse<PaginatedContent<Job>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const data = Array.isArray(record.data)
      ? record.data.map(normalizeJob)
      : [];
    return {
      ...content,
      data,
      pageIndex: pickNumber(record, "pageIndex", "page"),
      pageSize: pickNumber(record, "pageSize"),
      totalRow: pickNumber(record, "totalRow", "total"),
      totalPages: pickNumber(record, "totalPages"),
    };
  });
}

export function normalizePaginatedHiringPostsResponse(
  response: ApiResponse<PaginatedContent<HiringPost>>,
): ApiResponse<PaginatedContent<HiringPost>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    return {
      ...content,
      data: Array.isArray(record.data)
        ? record.data.map(normalizeHiringPost)
        : [],
      pageIndex: pickNumber(record, "pageIndex", "page"),
      pageSize: pickNumber(record, "pageSize"),
      totalRow: pickNumber(record, "totalRow", "total"),
      totalPages: pickNumber(record, "totalPages"),
    };
  });
}

export function normalizePaginatedHiringApplicationsResponse(
  response: ApiResponse<PaginatedContent<HiringApplication>>,
): ApiResponse<PaginatedContent<HiringApplication>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    return {
      ...content,
      data: Array.isArray(record.data)
        ? record.data.map(normalizeHiringApplication)
        : [],
      pageIndex: pickNumber(record, "pageIndex", "page"),
      pageSize: pickNumber(record, "pageSize"),
      totalRow: pickNumber(record, "totalRow", "total"),
      totalPages: pickNumber(record, "totalPages"),
    };
  });
}

export function normalizePaginatedCandidatesResponse(
  response: ApiResponse<PaginatedContent<CandidateProfile>>,
): ApiResponse<PaginatedContent<CandidateProfile>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const data = Array.isArray(record.data)
      ? record.data.map(normalizeCandidateProfile)
      : [];
    return {
      ...content,
      data,
      pageIndex: pickNumber(record, "pageIndex", "page"),
      pageSize: pickNumber(record, "pageSize"),
      totalRow: pickNumber(record, "totalRow", "total"),
      totalPages: pickNumber(record, "totalPages"),
    };
  });
}

export function normalizeJobsResponse(
  response: ApiResponse<Job[]>,
): ApiResponse<Job[]> {
  return mapApiResponse(response, (content) => content.map(normalizeJob));
}

export function normalizeRecommendedJobsResponse(
  response: ApiResponse<RecommendationContent<RecommendedJob>>,
): ApiResponse<RecommendationContent<RecommendedJob>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const data = Array.isArray(record.data)
      ? record.data.map(normalizeRecommendedJob)
      : [];

    return {
      ...content,
      data,
      model: pickString(record, "model"),
      elapsedMs: pickNumber(record, "elapsedMs", "elapsed_ms"),
      generatedAt: pickString(record, "generatedAt", "generated_at") ?? null,
      quota: record.quota
        ? normalizeRecommendationQuota(record.quota)
        : undefined,
      cache: normalizeRecommendationCache(record.cache),
    };
  });
}

export function normalizeRecommendedCandidatesResponse(
  response: ApiResponse<RecommendationContent<RecommendedCandidate>>,
): ApiResponse<RecommendationContent<RecommendedCandidate>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const data = Array.isArray(record.data)
      ? record.data.map(normalizeRecommendedCandidate)
      : [];

    return {
      ...content,
      data,
      model: pickString(record, "model"),
      elapsedMs: pickNumber(record, "elapsedMs", "elapsed_ms"),
      generatedAt: pickString(record, "generatedAt", "generated_at") ?? null,
      quota: record.quota
        ? normalizeRecommendationQuota(record.quota)
        : undefined,
      cache: normalizeRecommendationCache(record.cache),
    };
  });
}

export function normalizeJobResponse<
  T extends Job & { binhLuans?: Comment[]; comments?: Comment[] },
>(response: ApiResponse<T>): ApiResponse<Job & { binhLuans?: Comment[] }> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const comments = Array.isArray(record.binhLuans)
      ? record.binhLuans.map(normalizeComment)
      : Array.isArray(record.comments)
        ? record.comments.map(normalizeComment)
        : undefined;
    return { ...normalizeJob(content), binhLuans: comments };
  });
}

export function normalizeCategoriesResponse(
  response: ApiResponse<JobType[]>,
): ApiResponse<JobType[]> {
  return mapApiResponse(response, (content) => content.map(normalizeCategory));
}

export function normalizeSubcategoriesResponse(
  response: ApiResponse<JobDetailType[]>,
): ApiResponse<JobDetailType[]> {
  return mapApiResponse(response, (content) =>
    content.map(normalizeSubcategory),
  );
}

export function normalizeCommentsResponse(
  response: ApiResponse<Comment[]>,
): ApiResponse<Comment[]> {
  return mapApiResponse(response, (content) => content.map(normalizeComment));
}

export function normalizeHiredJobsResponse(
  response: ApiResponse<HiredJob[]>,
): ApiResponse<HiredJob[]> {
  return mapApiResponse(response, (content) => content.map(normalizeHiredJob));
}

export function toJobPayload(data: CreateJob | UpdateJob) {
  return {
    title: data.tenCongViec,
    price: data.giaTien,
    shortDescription: data.moTaNgan,
    description: data.moTa,
    subcategoryId: data.maChiTietLoai,
  };
}

export function toCategoryPayload(
  data:
    | Pick<JobType, "tenLoaiCongViec">
    | Partial<Pick<JobType, "tenLoaiCongViec">>,
) {
  return { name: data.tenLoaiCongViec };
}

export function toSubcategoryPayload(data: Partial<JobDetailType>) {
  return {
    name: data.tenChiTiet,
    image: data.hinhAnh,
    categoryId: data.maLoaiCongViec,
  };
}

export function toCommentPayload(data: CreateComment) {
  return {
    jobId: data.maCongViec,
    content: data.noiDung,
    rating: data.saoBinhLuan,
  };
}
