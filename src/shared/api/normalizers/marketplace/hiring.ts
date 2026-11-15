import type { ApiResponse, HiringApplication, HiringPost, PaginatedContent } from '@/shared/schemas'
import { asRecord, mapApiResponse, pickBoolean, pickNumber, pickRole, pickString } from '../core'

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
    careerField: pickString(record, "careerField") ?? null,
    yearsRequired: pickNumber(record, "yearsRequired") ?? null,
    skills: Array.isArray(record.skills)
      ? record.skills.filter((skill): skill is string => typeof skill === "string")
      : [],
    closesAt: pickString(record, "closesAt") ?? null,
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
