import { describe, expect, it } from 'vitest'
import { createCommentSchema, createJobSchema, paginatedContentSchema, recommendationScoreSchema, recommendedJobSchema, signInSchema, signUpSchema } from './domain'

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

  it('validates recommendation labels and recommended jobs', () => {
    const recommendation = recommendationScoreSchema.parse({
      rank: 1,
      aiScore: 0.82,
      finalScore: 0.79,
      label: 'high_match',
      skillScore: 0.75,
      seniorityScore: 1,
      categoryScore: 0.5,
      requiredSkills: ['Python', 'Docker'],
      matchedSkills: ['Python'],
      missingSkills: ['Docker'],
      improvementTips: ['Add Docker project evidence.'],
    })

    expect(recommendation.label).toBe('high_match')
    expect(recommendation.missingSkills).toEqual(['Docker'])
    expect(
      recommendedJobSchema.parse({
        id: 9,
        tenCongViec: 'Backend API',
        giaTien: 250,
        recommendation,
      }).recommendation.finalScore
    ).toBe(0.79)
  })

  it('validates signup account roles', () => {
    expect(
      signUpSchema.parse({
        name: 'Hiring Manager',
        email: 'hiring@example.com',
        password: 'password123',
        role: 'employer',
      }).role
    ).toBe('employer')

    expect(() =>
      signUpSchema.parse({
        name: 'Hiring Manager',
        email: 'hiring@example.com',
        password: 'password123',
        role: 'recruiting-admin',
      })
    ).toThrow()
  })
})
