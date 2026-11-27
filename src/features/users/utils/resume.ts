/**
 * Resume draft constants, file validation, and CV text extraction helpers. Validates PDF/DOC/DOCX uploads, extracts fields from PDF, DOCX, or JSON files, and converts between form drafts and API import payloads.
 *
 * Calls: UserValidationError; parseResumeJobs; savedResumeJobs; serializeResumeJobs
 * Used by:
 *   - features/users/components/profile/profile-content.tsx
 *   - features/users/components/profile/profile-page.tsx
 *   - features/users/components/resume/resume-career-fields.tsx
 *   - features/workspace/components/settings/resume-settings-editor.tsx
 *   - features/workspace/components/settings/resume-settings-section.tsx
 */

import { UserValidationError } from '@/shared/lib/errors'
import type { ImportResume, ResumeData, UserResume } from '@/shared/schemas'
import { parseResumeJobs, savedResumeJobs, serializeResumeJobs } from './resume-career'

export const resumeSchemaVersion = 'resume-atlas-v1'
export const resumeFieldKeys = [
  'ResumeID',
  'Category',
  'Name',
  'Email',
  'Phone',
  'Location',
  'Role',
  'Occupation',
  'Specialty',
  'Degree',
  'FieldOfStudy',
  'Summary',
  'Skills',
  'Experience',
  'Education',
  'Jobs',
  'Text',
  'Source',
  // Read-only: shown as "previously: X", never sent (the backend keeps the stored value).
  'LegacyField',
] as const
export const userResumeFieldKeys = [
  'Name',
  'Email',
  'Phone',
  'Location',
  'Role',
  'Occupation',
  'Specialty',
  'Degree',
  'FieldOfStudy',
  'Summary',
  'Skills',
  'Experience',
  'Education',
  'Jobs',
  'Text',
] as const

export type ResumeFieldKey = (typeof resumeFieldKeys)[number]
export type UserResumeFieldKey = (typeof userResumeFieldKeys)[number]
export type ResumeDraft = Record<ResumeFieldKey, string>
type PdfTextItem = { str?: string }

export const resumeFileMaxSizeBytes = 10 * 1024 * 1024
export const resumeFileAccept = [
  '.pdf',
  '.doc',
  '.docx',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
].join(',')

const resumeUploadMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const resumeUploadExtensions = new Set(['pdf', 'doc', 'docx'])

const resumeSectionHeadings = [
  'summary',
  'professional summary',
  'profile',
  'objective',
  'skills',
  'technical skills',
  'core skills',
  'experience',
  'work experience',
  'work history',
  'employment history',
  'professional experience',
  'education',
  'certifications',
  'projects',
  'portfolio',
] as const


export const emptyResumeDraft: ResumeDraft = {
  ResumeID: '',
  Category: '',
  Name: '',
  Email: '',
  Phone: '',
  Location: '',
  Role: '',
  Occupation: '',
  Specialty: '',
  Degree: '',
  FieldOfStudy: '',
  Summary: '',
  Skills: '',
  Experience: '',
  Education: '',
  Jobs: '',
  Text: '',
  Source: '',
  LegacyField: '',
}

export function parseResumeJson(value: string): ImportResume {
  const parsed = JSON.parse(value) as unknown

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new UserValidationError('Resume JSON must be an object.')
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

export function validateResumeFile(file: File): { valid: true } | { valid: false; message: string } {
  if (file.size > resumeFileMaxSizeBytes) {
    return { valid: false, message: 'Resume file must be 10MB or smaller.' }
  }

  if (isImageFile(file)) {
    return {
      valid: false,
      message: 'Images are not readable for resume import. Attach a DOCX, PDF, or readable document instead.',
    }
  }

  if (!isSupportedResumeDocument(file)) {
    return { valid: false, message: 'Upload a PDF, DOC, or DOCX resume.' }
  }

  return { valid: true }
}

export function canExtractResumeFile(file: File) {
  const extension = getFileExtension(file)
  const type = file.type.toLowerCase()

  return (
    extension === 'pdf' ||
    extension === 'docx' ||
    type === 'application/pdf' ||
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

export async function extractResumeFile(file: File): Promise<ImportResume> {
  const validation = validateResumeFile(file)
  if (!validation.valid) {
    throw new UserValidationError(validation.message)
  }

  const extension = getFileExtension(file)
  const type = file.type.toLowerCase()

  if (extension === 'pdf' || type === 'application/pdf') {
    return extractResumeFromText(await extractPdfText(file), file.name)
  }

  if (
    extension === 'docx' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractResumeFromText(await extractDocxText(file), file.name)
  }

  throw new UserValidationError('DOC files can be uploaded, but browser extraction supports PDF and DOCX.')
}

export function extractResumeFromText(text: string, sourceFileName?: string): ImportResume {
  const normalizedText = normalizeResumeText(text)

  if (!normalizedText) {
    throw new UserValidationError('Resume file does not contain readable text.')
  }

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const summary = extractSection(normalizedText, ['professional summary', 'summary', 'profile', 'objective'])
  const experience = extractSection(normalizedText, [
    'work history',
    'professional experience',
    'work experience',
    'employment history',
    'experience',
  ])
  const education = extractSection(normalizedText, ['education'])

  return {
    data: {
      Name: findLabeledValue(normalizedText, 'Name') ?? inferResumeName(lines),
      Email: extractEmail(normalizedText),
      Phone: extractPhone(normalizedText),
      Location: findLabeledValue(normalizedText, 'Location') ?? inferLocation(lines),
      Role: findLabeledValue(normalizedText, 'Role') ?? findLabeledValue(normalizedText, 'Title') ?? inferResumeRole(lines),
      Summary: summary,
      // Skills are not copied from the text: the dictionary scan suggests them and the user confirms.
      Skills: '',
      Experience: experience,
      Education: education,
      Degree: inferDegree(education),
      Text: normalizedText,
    },
    sourceFileName: sourceFileName?.trim() || undefined,
    schemaVersion: resumeSchemaVersion,
  }
}

/**
 * The highest degree named in a CV's Education section, on the form's list (Bachelor, Master or higher, Below
 * bachelor). Empty when none is named, so the user chooses.
 */
export function inferDegree(education: string): string {
  const text = education.toLowerCase()
  const has = (pattern: RegExp) => pattern.test(text)
  if (has(/\b(ph\.?\s?d|doctor(ate)?|master'?s?|m\.?\s?sc|mba|m\.?\s?eng)\b/)) return 'Master or higher'
  if (has(/\b(bachelor'?s?|b\.?\s?sc|b\.?\s?eng|bba|undergraduate degree|engineer'?s degree)\b/) || has(/\bb\.\s?[as]\./)) return 'Bachelor'
  if (has(/\b(associate'?s? degree|diploma|high school|secondary school|college certificate|vocational)\b/)) return 'Below bachelor'
  return ''
}

/**
 * What a CV extraction found, without the empty fields: the extracted form fills in what it read and keeps the rest,
 * so an extraction never clears the saved skill list or degree.
 */
export function extractedResumeFields(data?: ResumeData | null): Partial<ResumeDraft> {
  return Object.fromEntries(Object.entries(resumeDraftFromData(data)).filter(([, value]) => value.trim())) as Partial<ResumeDraft>
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
    // A resume saved before occupations and not yet migrated still has its old field as Industry.
    const value = key === 'LegacyField' ? data?.LegacyField || data?.Industry : data?.[key]
    // The draft holds strings only, so the job list travels inside it as JSON.
    draft[key] = key === 'Jobs' ? (parseResumeJobs(value).length ? serializeResumeJobs(parseResumeJobs(value)) : '')
      : typeof value === 'string' ? value : ''
    return draft
  }, { ...emptyResumeDraft })
}

export function resumeDraftToImportPayload(
  draft: ResumeDraft,
  schemaVersion = resumeSchemaVersion
): ImportResume {
  const data = userResumeFieldKeys.reduce<ResumeData>((result, key) => {
    if (key === 'Jobs') {
      const jobs = savedResumeJobs(parseResumeJobs(draft.Jobs))
      if (jobs.length) result.Jobs = jobs
      return result
    }
    const value = draft[key].trim()
    if (value) result[key] = value
    return result
  }, {})

  return {
    data,
    schemaVersion,
  }
}

export function hasResumeDraftInput(draft: ResumeDraft) {
  return userResumeFieldKeys.some((key) =>
    key === 'Jobs' ? savedResumeJobs(parseResumeJobs(draft.Jobs)).length > 0 : Boolean(draft[key].trim()))
}

function normalizeResumeData(data: ResumeData): ResumeData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new UserValidationError('Resume JSON must include a data object.')
  }

  return data
}

function isSupportedResumeDocument(file: File) {
  const extension = getFileExtension(file)
  const type = file.type.toLowerCase()

  return resumeUploadExtensions.has(extension) || resumeUploadMimeTypes.has(type)
}

function isImageFile(file: File) {
  const extension = getFileExtension(file)
  const type = file.type.toLowerCase()

  return type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'].includes(extension)
}

function getFileExtension(file: File) {
  return file.name.split('.').pop()?.toLowerCase() ?? ''
}

async function extractPdfText(file: File) {
  const pdfjs = await import('pdfjs-dist')

  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
  }

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((item) => ('str' in item ? (item as PdfTextItem).str ?? '' : ''))
        .join(' ')
    )
  }

  return pages.join('\n')
}

async function extractDocxText(file: File) {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value
}

function normalizeResumeText(text: string) {
  return text
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? ''
}

function extractPhone(text: string) {
  return text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.replace(/\s+/g, ' ').trim() ?? ''
}

function inferLocation(lines: string[]) {
  return (
    lines.find((line) => {
      if (extractEmail(line) || extractPhone(line)) return false
      return /^[A-Za-z][A-Za-z .'-]+,\s*[A-Za-z]{2,}(?:\s+\d{4,6})?$/.test(line)
    }) ?? ''
  )
}

function inferResumeRole(lines: string[]) {
  const skipped = new Set(['email', 'phone', 'location', 'summary', 'skills', 'education'])
  return (
    lines
      .slice(1, 5)
      .find((line) => {
        const normalized = line.toLowerCase()
        return (
          !skipped.has(normalized) &&
          !line.includes('@') &&
          !extractPhone(line) &&
          !/^\d{4,}$/.test(line.replace(/\D/g, ''))
        )
      }) ?? ''
  )
}

function inferResumeName(lines: string[]) {
  return (
    lines.slice(0, 8).find((line) => {
      if (line.length > 80 || extractEmail(line) || extractPhone(line)) return false
      if (isHeading(line) || inferResumeCategory([line]) === line) return false
      const words = line.split(/\s+/)
      return words.length >= 2 && words.length <= 5 && words.every((word) => /^[A-Z][A-Za-z'.-]+$/.test(word))
    }) ?? ''
  )
}

function inferResumeCategory(lines: string[]) {
  return (
    lines.slice(0, 14).find((line) => {
      if (line.length > 80 || extractEmail(line) || extractPhone(line)) return false
      return /\b(developer|engineer|designer|analyst|manager|administrator|architect|consultant|scientist|lead)\b/i.test(line)
    }) ?? ''
  )
}

function findLabeledValue(text: string, label: string) {
  const expression = new RegExp(`^\\s*${label}\\s*[:\\-]\\s*(.+)$`, 'im')
  return text.match(expression)?.[1]?.trim()
}

function extractSection(text: string, headings: string[]) {
  const lines = text.split('\n')
  const startIndex = lines.findIndex((line) => headings.some((heading) => lineMatchesHeading(line, heading)))

  if (startIndex === -1) return ''

  const startLine = lines[startIndex]
  const inlineValue = startLine.includes(':') ? startLine.split(':').slice(1).join(':').trim() : ''
  const sectionLines: string[] = inlineValue ? [inlineValue] : []

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim()
    if (!line) continue
    if (isHeading(line)) break
    sectionLines.push(line)
  }

  return compactSection(sectionLines)
}



function compactSection(lines: string[]) {
  return lines.join(' ').replace(/\s+/g, ' ').trim()
}

function lineMatchesHeading(line: string, heading: string) {
  const normalized = line.replace(/[:\-]+$/, '').trim().toLowerCase()
  return normalized === heading || normalized.startsWith(`${heading}:`)
}

function isHeading(line: string) {
  const normalized = line.replace(/[:\-]+$/, '').trim().toLowerCase()
  return resumeSectionHeadings.some((heading) => normalized === heading || normalized.startsWith(`${heading}:`))
}

