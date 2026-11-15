import { describe, expect, it } from 'vitest'
import { createCommentSchema, createJobSchema, paginatedContentSchema, recommendationScoreSchema, recommendedJobSchema, signInSchema, signUpSchema } from './domain'

describe('domain schemas', () => {
  it('normalizes sign in emails', () => {
    const parsed = signInSchema.parse({ email: '  USER@EXAMPLE.COM ', password: 'secret' })
    expect(parsed.email).toBe('user@example.com')
  })

  it('coerces create job fields and validates ranges', () => {
    const parsed = createJobSchema.parse({
      title: '  Landing Page  ',
      price: '150',
      subcategoryId: '3',
      rating: '5',
    })
    expect(parsed.title).toBe('Landing Page')
    expect(parsed.price).toBe(150)
    expect(parsed.subcategoryId).toBe(3)
    expect(parsed.rating).toBe(5)
    expect(() =>
      createJobSchema.parse({
        title: '   ',
        price: '150',
        subcategoryId: '3',
      })
    ).toThrow()
  })

  it('provides defaults for paginated content and rejects invalid comments', () => {
    const schema = paginatedContentSchema(createCommentSchema)
    expect(schema.parse({}).data).toEqual([])
    expect(() => createCommentSchema.parse({ jobId: 1, content: '   ', rating: 0 })).toThrow()
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
        recruiterId: 2,
        title: 'Backend API',
        description: 'Build and run the public API.',
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

  it('rejects new account passwords shorter than ten characters', () => {
    expect(() =>
      signUpSchema.parse({
        name: 'New member',
        email: 'member@example.com',
        password: 'short123',
        role: 'user',
      })
    ).toThrow()
  })
})
