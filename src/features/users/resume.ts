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
export const userResumeFieldKeys = [
  'Name',
  'Email',
  'Phone',
  'Location',
  'Summary',
  'Skills',
  'Experience',
  'Education',
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

const knownSkills = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'NestJS',
  'Express',
  'Java',
  'Spring',
  'Python',
  'Django',
  'SQL',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Git',
  'Linux',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'HTML',
  'CSS',
  'Tailwind',
  'GraphQL',
  'REST',
] as const

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
    throw new Error(validation.message)
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

  throw new Error('DOC files can be uploaded, but browser extraction supports PDF and DOCX.')
}

export function extractResumeFromText(text: string, sourceFileName?: string): ImportResume {
  const normalizedText = normalizeResumeText(text)

  if (!normalizedText) {
    throw new Error('Resume file does not contain readable text.')
  }

  const lines = normalizedText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const summary = extractSection(normalizedText, ['professional summary', 'summary', 'profile', 'objective'])
  const skills = extractSkills(normalizedText)
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
      Summary: summary,
      Skills: skills,
      Experience: experience,
      Education: education,
      Text: normalizedText,
    },
    sourceFileName: sourceFileName?.trim() || undefined,
    schemaVersion: resumeSchemaVersion,
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
  schemaVersion = resumeSchemaVersion
): ImportResume {
  const data = userResumeFieldKeys.reduce<ResumeData>((result, key) => {
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
  return userResumeFieldKeys.some((key) => Boolean(draft[key].trim()))
}

function normalizeResumeData(data: ResumeData): ResumeData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Resume JSON must include a data object.')
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

function findLabeledValue(text: string, label: ResumeFieldKey) {
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

function extractSkills(text: string) {
  const explicitSkills = extractSection(text, ['technical skills', 'core skills', 'skills'])
  const skills = explicitSkills
    ? explicitSkills
        .split(/[,|;\n]/)
        .map((skill) => cleanSkill(skill))
        .filter(Boolean)
    : knownSkills.filter((skill) => new RegExp(`\\b${escapeRegExp(skill)}\\b`, 'i').test(text))

  return Array.from(new Set(skills)).slice(0, 40).join(', ')
}

function cleanSkill(value: string) {
  return value.replace(/^[-*]\s*/, '').trim()
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
