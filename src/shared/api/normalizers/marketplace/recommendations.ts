import type { ApiResponse, CandidateProfile, PaginatedContent, RecommendationContent, RecommendationLabel, RecommendationScore, RecommendedCandidate, RecommendedJob, UserProfile } from '@/shared/schemas'
import { asRecord, mapApiResponse, pickBoolean, pickNumber, pickRole, pickString, pickStringArray } from '../core'
import { normalizeHiringPost } from './hiring'

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
    ...normalizeHiringPost(raw),
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
  const careerRecord = record.career && typeof record.career === "object" ? asRecord(record.career) : null;
  const educationRecord = record.education && typeof record.education === "object" ? asRecord(record.education) : null;
  const educationDegree = educationRecord ? pickString(educationRecord, "degree") : undefined;
  const education = educationDegree
    ? {
        degree: educationDegree,
        fieldOfStudy: pickString(educationRecord!, "fieldOfStudy") ?? null,
      }
    : undefined;
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
      listedServices: pickNumber(statsRecord, "listedServices") ?? 0,
      certifications: pickNumber(statsRecord, "certifications") ?? 0,
      completedWork: pickNumber(statsRecord, "completedWork") ?? 0,
      rating: pickNumber(statsRecord, "rating") ?? 0,
    },
    career: careerRecord
      ? {
          occupationCode: pickString(careerRecord, "occupationCode") ?? null,
          occupationTitle: pickString(careerRecord, "occupationTitle") ?? null,
          specialty: pickString(careerRecord, "specialty") ?? null,
          level: pickString(careerRecord, "level") ?? null,
          yearsInOccupation: pickNumber(careerRecord, "yearsInOccupation") ?? null,
          relatedYears: pickNumber(careerRecord, "relatedYears") ?? null,
          legacyField: pickString(careerRecord, "legacyField") ?? null,
        }
      : null,
    ...(education ? { education } : {}),
    profileStrength: pickNumber(record, "profileStrength") ?? null,
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
