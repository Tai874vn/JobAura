import { describe, expect, it } from 'vitest'
import { createCommentSchema, createJobSchema, paginatedContentSchema, signInSchema } from './domain'

describe('domain schemas', () => {
  it('normalizes sign in emails', () => {
    const parsed = signInSchema.parse({ email: '  USER@EXAMPLE.COM ', password: 'secret' })
    expect(parsed.email).toBe('user@example.com')
  })

  it('coerces create job fields and validates ranges', () => {
    const parsed = createJobSchema.parse({
      tenCongViec: 'Landing Page',
      giaTien: '150',
      maChiTietLoai: '3',
      saoCongViec: '5',
    })
    expect(parsed.giaTien).toBe(150)
    expect(parsed.maChiTietLoai).toBe(3)
    expect(parsed.saoCongViec).toBe(5)
  })

  it('provides defaults for paginated content and rejects invalid comments', () => {
    const schema = paginatedContentSchema(createCommentSchema)
    expect(schema.parse({}).data).toEqual([])
    expect(() => createCommentSchema.parse({ maCongViec: 1, noiDung: '', saoBinhLuan: 0 })).toThrow()
  })
})
