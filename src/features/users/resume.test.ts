import { describe, expect, it } from 'vitest'
import {
  extractResumeFromText,
  hasResumeDraftInput,
  parseResumeJson,
  resumeDraftFromData,
  resumeDraftToImportPayload,
  resumeFileMaxSizeBytes,
  resumeSchemaVersion,
  resumeSkills,
  validateResumeFile,
} from './resume'

describe('resume helpers', () => {
  it('parses wrapped ResumeAtlas import payloads', () => {
    const result = parseResumeJson(
      JSON.stringify({
        data: {
          ResumeID: 'REAL_0001',
          Name: 'Chad Griffin',
          Skills: 'Python, SQL, Git',
        },
        sourceFileName: 'resume.pdf',
        schemaVersion: 'resume-atlas-v1',
      })
    )

    expect(result.data.Name).toBe('Chad Griffin')
    expect(result.sourceFileName).toBe('resume.pdf')
    expect(result.schemaVersion).toBe('resume-atlas-v1')
  })

  it('accepts raw resume data and adds the current schema version', () => {
    const result = parseResumeJson(JSON.stringify({ ResumeID: 'REAL_0002', Name: 'Sam Rivera' }))

    expect(result.data.ResumeID).toBe('REAL_0002')
    expect(result.schemaVersion).toBe(resumeSchemaVersion)
  })

  it('splits comma-separated skills into chips', () => {
    expect(resumeSkills('Python, SQL, Git,  ')).toEqual(['Python', 'SQL', 'Git'])
  })

  it('builds import payloads from structured form fields', () => {
    const draft = resumeDraftFromData({
      ResumeID: 'REAL_0001',
      Category: 'Java Developer',
      Name: 'Chad Griffin',
      Skills: 'Python, SQL',
      Summary: '',
      Source: 'ResumeAtlas',
    })
    const payload = resumeDraftToImportPayload(draft)

    expect(hasResumeDraftInput(draft)).toBe(true)
    expect(payload).toEqual({
      data: {
        Name: 'Chad Griffin',
        Skills: 'Python, SQL',
      },
      schemaVersion: resumeSchemaVersion,
    })
  })

  it('extracts resume fields from raw CV text', () => {
    const result = extractResumeFromText(
      `
      Chad Griffin
      Java Developer
      City, State
      contact@email.com
      94105 555 4321000

      Professional Summary
      Highly skilled software development professional bringing 10 years software design development integration.

      Skills
      Python, SQL, Git, Linux

      Work History
      Senior Java Developer / Tech Lead
      Built customer facing internal web applications.

      Education
      Computer Science degree
      `,
      'chad-resume.pdf'
    )

    expect(result).toEqual({
      data: expect.objectContaining({
        Name: 'Chad Griffin',
        Email: 'contact@email.com',
        Phone: '94105 555 4321000',
        Location: 'City, State',
        Summary: 'Highly skilled software development professional bringing 10 years software design development integration.',
        Skills: 'Python, SQL, Git, Linux',
        Experience: 'Senior Java Developer / Tech Lead Built customer facing internal web applications.',
        Education: 'Computer Science degree',
        Text: expect.stringContaining('Professional Summary'),
      }),
      sourceFileName: 'chad-resume.pdf',
      schemaVersion: resumeSchemaVersion,
    })
  })

  it('infers known skills when a skills section is missing', () => {
    const result = extractResumeFromText('Jane Doe\nBackend Engineer\nBuilt APIs with NestJS, TypeScript, PostgreSQL, Docker, and AWS.')

    expect(result.data.Skills).toBe('TypeScript, NestJS, PostgreSQL, Docker, AWS')
  })

  it('accepts backend-supported resume document files', () => {
    expect(validateResumeFile(new File(['pdf'], 'resume.pdf', { type: 'application/pdf' }))).toEqual({
      valid: true,
    })
    expect(validateResumeFile(new File(['docx'], 'resume.docx', { type: '' }))).toEqual({
      valid: true,
    })
  })

  it('rejects unsupported resume files and files over 10MB', () => {
    expect(validateResumeFile(new File(['image'], 'resume.png', { type: 'image/png' }))).toEqual({
      valid: false,
      message: 'Images are not readable for resume import. Attach a DOCX, PDF, or readable document instead.',
    })

    expect(validateResumeFile(new File(['text'], 'resume.txt', { type: 'text/plain' }))).toEqual({
      valid: false,
      message: 'Upload a PDF, DOC, or DOCX resume.',
    })

    expect(
      validateResumeFile(
        new File([new Uint8Array(resumeFileMaxSizeBytes + 1)], 'resume.pdf', {
          type: 'application/pdf',
        })
      )
    ).toEqual({
      valid: false,
      message: 'Resume file must be 10MB or smaller.',
    })
  })
})
