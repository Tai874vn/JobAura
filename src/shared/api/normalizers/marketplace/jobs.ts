import type { ApiResponse, Comment, CreateComment, CreateJob, HiredJob, Job, JobDetailType, JobType, PaginatedContent, UpdateJob } from '@/shared/schemas'
import { asRecord, mapApiResponse, pickBoolean, pickNumber, pickString, pickUser } from '../core'

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
