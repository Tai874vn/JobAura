/**
 * Normalizes raw backend hiring post and application payloads (including paginated lists and the viewer's own application state) into clean frontend objects with safe defaults.
 *
 * Calls: hiringApplicationStatusSchema; hiringPipelineCountsSchema; hiringStatusReasonSchema; asRecord; mapApiResponse; pickBoolean; pickNumber; pickString
 * Used by:
 *   - shared/api/normalizers/marketplace.ts
 *   - shared/api/normalizers/marketplace/recommendations.ts
 */

import { hiringApplicationStatusSchema, hiringPipelineCountsSchema, hiringStatusReasonSchema } from '@/shared/schemas'
import type { ApiResponse, HiringApplication, HiringPost, PaginatedContent } from '@/shared/schemas'
import { asRecord, mapApiResponse, pickBoolean, pickNumber, pickRole, pickString } from '../core'

function normalizeViewerApplication(raw: unknown): HiringPost["viewerApplication"] {
  if (!raw || typeof raw !== "object") return null;
  const record = asRecord(raw);
  const id = pickNumber(record, "id");
  const status = hiringApplicationStatusSchema.safeParse(pickString(record, "status"));
  if (id === undefined || !status.success) return null;
  const reason = hiringStatusReasonSchema.safeParse(pickString(record, "statusReason"));
  return { id, status: status.data, statusReason: reason.success ? reason.data : null };
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
    companyName: pickString(record, "companyName") ?? null,
    occupationCode: pickString(record, "occupationCode") ?? null,
    occupationTitle: pickString(record, "occupationTitle") ?? null,
    specialty: pickString(record, "specialty") ?? null,
    legacyField: pickString(record, "legacyField") ?? null,
    yearsRequired: pickNumber(record, "yearsRequired") ?? null,
    skills: Array.isArray(record.skills)
      ? record.skills.filter((skill): skill is string => typeof skill === "string")
      : [],
    closesAt: pickString(record, "closesAt") ?? null,
    aiStatus: pickString(record, "aiStatus") ?? null,
    aiStatusMessage: pickString(record, "aiStatusMessage") ?? null,
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
    openings: pickNumber(record, "openings") ?? null,
    hiredCount: pickNumber(record, "hiredCount") ?? 0,
    offersWaiting: pickNumber(record, "offersWaiting") ?? 0,
    pipeline: hiringPipelineCountsSchema.safeParse(record.pipeline).data,
    viewerHasApplied: pickBoolean(record, "viewerHasApplied") ?? false,
    // The viewer's own application (a withdrawn one too); null when the card has none.
    viewerApplication: normalizeViewerApplication(record.viewerApplication),
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
    status: hiringApplicationStatusSchema.safeParse(status).success
      ? (status as HiringApplication["status"])
      : "APPLIED",
    statusReason: hiringStatusReasonSchema.safeParse(pickString(record, "statusReason")).success
      ? (pickString(record, "statusReason") as HiringApplication["statusReason"])
      : null,
    statusNote: pickString(record, "statusNote") ?? null,
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
