import { z } from "zod";

export const apiResponseSchema = <T extends z.ZodType>(content: T) =>
  z.object({
    statusCode: z.number().optional(),
    message: z.union([z.string(), z.array(z.string())]).optional(),
    content: content.optional(),
    dateTime: z.string().optional(),
  });

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(12),
  keyword: z.string().trim().max(80).optional(),
});

export const paginatedContentSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    pageIndex: z.number().optional(),
    pageSize: z.number().optional(),
    totalRow: z.number().optional(),
    totalPages: z.number().optional(),
    keywords: z.string().optional(),
    data: z.array(item).default([]),
  });
