/**
 * Normalizes raw backend responses for service jobs, categories, subcategories, and job comments, and builds request payloads for creating or updating them.
 *
 * Calls: asRecord; mapApiResponse; pickNumber; pickString; pickUser
 * Used by:
 *   - shared/api/normalizers/marketplace.ts
 */

import type { ApiResponse, Comment, CreateComment, CreateJob, Job, Subcategory, Category, PaginatedContent, UpdateJob } from '@/shared/schemas'
import { asRecord, mapApiResponse, pickNumber, pickString, pickUser } from '../core'

export function normalizeCategory(raw: unknown): Category {
  const record = asRecord(raw);
  return {
    ...(record as Partial<Category>),
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "",
    subcategories: Array.isArray(record.subcategories)
      ? record.subcategories.map(normalizeSubcategory)
      : undefined,
  };
}

export function normalizeSubcategory(raw: unknown): Subcategory {
  const record = asRecord(raw);
  return {
    ...(record as Partial<Subcategory>),
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "",
    image: pickString(record, "image") ?? null,
    categoryId: pickNumber(record, "categoryId"),
    category: record.category ? normalizeCategory(record.category) : undefined,
  };
}

export function normalizeJob(raw: unknown): Job {
  const record = asRecord(raw);
  return {
    ...(record as Partial<Job>),
    id: pickNumber(record, "id") ?? 0,
    title: pickString(record, "title") ?? "",
    price: pickNumber(record, "price") ?? 0,
    shortDescription: pickString(record, "shortDescription") ?? null,
    description: pickString(record, "description") ?? null,
    subcategoryId: pickNumber(record, "subcategoryId"),
    creatorId: pickNumber(
      record,
      "creatorId", "userId", "ownerId", "createdById", "authorId", "sellerId"),
    image: pickString(record, "image") ?? null,
    reviews: pickNumber(record, "reviews") ?? 0,
    rating: pickNumber(record, "rating") ?? 0,
    createdAt: pickString(record, "createdAt"),
    updatedAt: pickString(record, "updatedAt"),
    subcategory: record.subcategory ? normalizeSubcategory(record.subcategory) : undefined,
    user: pickUser(
      record,
      "user", "creator", "owner", "seller"),
  };
}

export function normalizeComment(raw: unknown): Comment {
  const record = asRecord(raw);
  const user = pickUser(
    record,
    "user", "commenter", "author", "createdBy");
  return {
    ...(record as Partial<Comment>),
    id: pickNumber(record, "id") ?? 0,
    jobId: pickNumber(record, "jobId") ?? 0,
    commenterId:
      pickNumber(
        record,
        "commenterId", "userId", "authorId", "createdById") ?? user?.id,
    commentedAt: pickString(
      record,
      "commentedAt", "createdAt"),
    content: pickString(record, "content", "comment") ?? "",
    rating: pickNumber(record, "rating") ?? 0,
    user,
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

export function normalizeJobsResponse(
  response: ApiResponse<Job[]>,
): ApiResponse<Job[]> {
  return mapApiResponse(response, (content) => content.map(normalizeJob));
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
  response: ApiResponse<Category[]>,
): ApiResponse<Category[]> {
  return mapApiResponse(response, (content) => content.map(normalizeCategory));
}

export function normalizeSubcategoriesResponse(
  response: ApiResponse<Subcategory[]>,
): ApiResponse<Subcategory[]> {
  return mapApiResponse(response, (content) =>
    content.map(normalizeSubcategory),
  );
}

export function normalizeCommentsResponse(
  response: ApiResponse<Comment[]>,
): ApiResponse<Comment[]> {
  return mapApiResponse(response, (content) => content.map(normalizeComment));
}

export function toJobPayload(data: CreateJob | UpdateJob) {
  return {
    title: data.title,
    price: data.price,
    shortDescription: data.shortDescription,
    description: data.description,
    subcategoryId: data.subcategoryId,
    workMode: data.workMode,
    serviceArea: data.serviceArea,
    milestoneTemplate: data.milestoneTemplate,
  };
}

export function toCategoryPayload(
  data:
    | Pick<Category, "name">
    | Partial<Pick<Category, "name">>,
) {
  return { name: data.name };
}

export function toSubcategoryPayload(data: Partial<Subcategory>) {
  return {
    name: data.name,
    image: data.image,
    categoryId: data.categoryId,
  };
}

export function toCommentPayload(data: CreateComment) {
  return {
    jobId: data.jobId,
    content: data.content,
    rating: data.rating,
  };
}
