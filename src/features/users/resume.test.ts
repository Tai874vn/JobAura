import { describe, expect, it } from 'vitest'
import { hasResumeDraftInput, parseResumeJson, resumeDraftFromData, resumeDraftToImportPayload, resumeSchemaVersion, resumeSkills } from './resume'

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
    const draft = resumeDraftFromData({ Name: 'Chad Griffin', Skills: 'Python, SQL', Summary: '' })
    const payload = resumeDraftToImportPayload(draft, 'resume.pdf')

    expect(hasResumeDraftInput(draft)).toBe(true)
    expect(payload).toEqual({
      data: {
        Name: 'Chad Griffin',
        Skills: 'Python, SQL',
      },
      sourceFileName: 'resume.pdf',
      schemaVersion: resumeSchemaVersion,
    })
  })
})
