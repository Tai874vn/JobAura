import type { ImportResume, ResumeData, UserResume } from '@/shared/schemas'

export const resumeSchemaVersion = 'resume-atlas-v1'
export const resumeFieldKeys = [
  'ResumeID',
  'Category',
  'Name',
  'Email',
  'Phone',
  'Location',
  'Summary',
  'Skills',
  'Experience',
  'Education',
  'Text',
  'Source',
] as const

export type ResumeFieldKey = (typeof resumeFieldKeys)[number]
export type ResumeDraft = Record<ResumeFieldKey, string>

export const emptyResumeDraft: ResumeDraft = {
  ResumeID: '',
  Category: '',
  Name: '',
  Email: '',
  Phone: '',
  Location: '',
  Summary: '',
  Skills: '',
  Experience: '',
  Education: '',
  Text: '',
  Source: '',
}

export function parseResumeJson(value: string): ImportResume {
  const parsed = JSON.parse(value) as unknown

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Resume JSON must be an object.')
  }

  const candidate = parsed as Partial<ImportResume> & Partial<ResumeData>
  const data = normalizeResumeData(
    candidate.data && typeof candidate.data === 'object' && !Array.isArray(candidate.data)
      ? (candidate.data as ResumeData)
      : (candidate as ResumeData)
  )

  return {
    data,
    sourceFileName: typeof candidate.sourceFileName === 'string' ? candidate.sourceFileName : undefined,
    schemaVersion: typeof candidate.schemaVersion === 'string' ? candidate.schemaVersion : resumeSchemaVersion,
  }
}

export function resumeSkills(value?: string | null) {
  return (value ?? '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean)
}

export function getResumeData(resume?: UserResume | null) {
  return resume?.data
}

export function resumeDraftFromData(data?: ResumeData | null): ResumeDraft {
  return resumeFieldKeys.reduce<ResumeDraft>((draft, key) => {
    const value = data?.[key]
    draft[key] = typeof value === 'string' ? value : ''
    return draft
  }, { ...emptyResumeDraft })
}

export function resumeDraftToImportPayload(
  draft: ResumeDraft,
  sourceFileName?: string,
  schemaVersion = resumeSchemaVersion
): ImportResume {
  const data = resumeFieldKeys.reduce<ResumeData>((result, key) => {
    const value = draft[key].trim()
    if (value) result[key] = value
    return result
  }, {})

  return {
    data,
    sourceFileName: sourceFileName?.trim() || undefined,
    schemaVersion,
  }
}

export function hasResumeDraftInput(draft: ResumeDraft) {
  return resumeFieldKeys.some((key) => Boolean(draft[key].trim()))
}

function normalizeResumeData(data: ResumeData): ResumeData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Resume JSON must include a data object.')
  }

  return data
}
