import { describe, expect, it } from 'vitest'
import {
  normalizeCategory,
  normalizeComment,
  normalizeHiredJob,
  normalizeJob,
  normalizeJobResponse,
  normalizeJobsResponse,
  normalizePaginatedJobsResponse,
  normalizeSubcategory,
  toCategoryPayload,
  toCommentPayload,
  toJobPayload,
  toSubcategoryPayload,
} from './normalizers'

describe('normalizers', () => {
  it('normalizes category and subcategory using fallback keys', () => {
    expect(normalizeCategory({ id: 3, name: 'Design' })).toEqual({ id: 3, name: 'Design', tenLoaiCongViec: 'Design' })

    expect(normalizeSubcategory({ id: 8, name: 'Logo', image: '/logo.png', categoryId: 3 })).toMatchObject({
      id: 8,
      name: 'Logo',
      tenChiTiet: 'Logo',
      hinhAnh: '/logo.png',
      maLoaiCongViec: 3,
    })
  })

  it('normalizes jobs, comments, and hired jobs', () => {
    const job = normalizeJob({
      id: 10,
      title: 'Landing page',
      price: 120,
      shortDescription: 'Fast delivery',
      description: 'Build and deploy',
      subcategoryId: 8,
      creatorId: 2,
      image: '/job.png',
      reviews: 5,
      rating: 4.8,
      subcategory: { id: 8, name: 'Logo' },
    })
    expect(job.tenCongViec).toBe('Landing page')
    expect(job.giaTien).toBe(120)
    expect(job.chiTietLoaiCongViec?.tenChiTiet).toBe('Logo')

    expect(normalizeComment({ id: 1, jobId: 10, userId: 2, content: 'Great', rating: 5 })).toEqual({
      id: 1,
      jobId: 10,
      userId: 2,
      content: 'Great',
      rating: 5,
      maCongViec: 10,
      maNguoiBinhLuan: 2,
      ngayBinhLuan: undefined,
      noiDung: 'Great',
      saoBinhLuan: 5,
      nguoiDung: undefined,
    })

    const hiredJob = normalizeHiredJob({ id: 4, jobId: 10, userId: 9, completed: true, job: { id: 10, title: 'Landing page', price: 120 } })
    expect(hiredJob.maCongViec).toBe(10)
    expect(hiredJob.hoanThanh).toBe(true)
    expect(hiredJob.congViec?.tenCongViec).toBe('Landing page')
  })

  it('normalizes list and paginated responses while preserving metadata', () => {
    expect(normalizeJobsResponse({ message: 'ok' })).toEqual({ message: 'ok' })

    const response = normalizePaginatedJobsResponse({
      statusCode: 200,
      content: {
        page: 2,
        pageSize: 10,
        total: 21,
        data: [{ id: 1, title: 'Test', price: 5 }],
      },
    } as never)

    expect(response.statusCode).toBe(200)
    expect(response.content?.pageIndex).toBe(2)
    expect(response.content?.totalRow).toBe(21)
    expect(response.content?.data[0].tenCongViec).toBe('Test')
  })

  it('normalizes detailed job response comments from either key', () => {
    const withComments = normalizeJobResponse({
      content: {
        id: 6,
        title: 'QA',
        price: 99,
        comments: [{ id: 2, jobId: 6, comment: 'Solid', rating: 4 }],
      },
    } as never)
    expect(withComments.content?.binhLuans?.[0].noiDung).toBe('Solid')
  })

  it('maps payloads to API contract keys', () => {
    expect(
      toJobPayload({
        tenCongViec: 'UI Design',
        giaTien: 30,
        moTaNgan: 'short',
        moTa: 'long',
        maChiTietLoai: 7,
        danhGia: 2,
        saoCongViec: 3,
      })
    ).toEqual({
      title: 'UI Design',
      price: 30,
      shortDescription: 'short',
      description: 'long',
      subcategoryId: 7,
      reviews: 2,
      rating: 3,
    })

    expect(toCategoryPayload({ tenLoaiCongViec: 'Web' })).toEqual({ name: 'Web' })
    expect(toSubcategoryPayload({ tenChiTiet: 'Frontend', hinhAnh: '/a.png', maLoaiCongViec: 1 })).toEqual({
      name: 'Frontend',
      image: '/a.png',
      categoryId: 1,
    })
    expect(toCommentPayload({ maCongViec: 4, noiDung: 'Nice', saoBinhLuan: 5 })).toEqual({
      jobId: 4,
      content: 'Nice',
      rating: 5,
    })
  })
})
