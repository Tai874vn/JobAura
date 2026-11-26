import { describe, expect, it } from 'vitest'
import { resumeEducation } from '../profile-page'

describe('resumeEducation', () => {
  it('shows a stated degree and a valid field-of-study code only', () => {
    expect(resumeEducation({ Degree: 'Bachelor', FieldOfStudy: '0613' })).toEqual({ degree: 'Bachelor', fieldOfStudy: '0613' })
    expect(resumeEducation({ Degree: 'Bachelor', FieldOfStudy: 'computing' })).toEqual({ degree: 'Bachelor', fieldOfStudy: null })
    expect(resumeEducation({ Degree: 'Not stated' })).toBeNull()
    expect(resumeEducation(null)).toBeNull()
  })
})
