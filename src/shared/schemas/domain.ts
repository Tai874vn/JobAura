import { z } from 'zod'

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
    keywords: z.string().optional(),
    data: z.array(item).default([]),
  })

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  passWord: z.string().optional(),
  phone: z.string().optional(),
  birthDay: z.string().optional(),
  avatar: z.string().optional().nullable(),
  gender: z.string().optional(),
  role: z.string().optional(),
  skill: z.string().optional().nullable(),
  certification: z.string().optional().nullable(),
  googleId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  birthDay: z.string().optional(),
  gender: z.string().optional(),
  role: z.string().optional(),
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

export const chatUserSchema = userSchema.pick({ id: true, name: true, avatar: true, email: true })

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

export type ApiResponse<T> = {
  statusCode?: number
  message?: string | string[]
  content?: T
  dateTime?: string
}
export type PaginatedContent<T> = z.infer<ReturnType<typeof paginatedContentSchema<z.ZodType<T>>>>
export type PaginationParams = z.infer<typeof paginationParamsSchema>
export type User = z.infer<typeof userSchema>
export type SignIn = z.infer<typeof signInSchema>
export type SignUp = z.infer<typeof signUpSchema>
export type Job = z.infer<typeof jobSchema>
export type CreateJob = z.infer<typeof createJobSchema>
export type UpdateJob = z.infer<typeof updateJobSchema>
export type JobType = z.infer<typeof jobTypeSchema>
export type JobDetailType = z.infer<typeof jobDetailTypeSchema>
export type Comment = z.infer<typeof commentSchema>
export type CreateComment = z.infer<typeof createCommentSchema>
export type HiredJob = z.infer<typeof hiredJobSchema>
export type ChatRoom = z.infer<typeof chatRoomSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type ChatUser = z.infer<typeof chatUserSchema>
