/**
 * Draft types, validation, payload builders, and date formatters for user certifications. Converts between saved API records and month-based form drafts, checks for missing or invalid fields, and flags expired credentials.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/users/components/profile/profile-page.tsx
 *   - features/users/components/resume/certification-fields.tsx
 *   - features/users/utils/profile/model.ts
 *   - features/workspace/components/settings/profile-settings-editor.tsx
 *   - features/workspace/hooks/use-profile-settings.ts
 */

import type { ProfileCertification } from '@/shared/schemas'

/**
 * A certification in the shape LinkedIn, Open Badges, and schema.org share: name, issuing organization, kind
 * (schema.org credentialCategory), issue and expiry month, credential ID and URL to verify it, and the skills it shows.
 * The form works in months ("2024-05"); the API stores the first day of the month.
 */
export const certificationCategories = ['Certification', 'License', 'Course', 'Badge'] as const

export type CertificationDraft = {
  name: string
  issuer: string
  category: string
  skills: string[]
  issuedAt: string
  expiresAt: string
  noExpiry: boolean
  credentialUrl: string
  credentialId: string
}

export const emptyCertificationDraft: CertificationDraft = {
  name: '', issuer: '', category: 'Certification', skills: [], issuedAt: '', expiresAt: '', noExpiry: false,
  credentialUrl: '', credentialId: '',
}

const month = (value?: string | null) => (value ? value.slice(0, 7) : '')

export function certificationDraft(cert: Omit<ProfileCertification, 'id'>): CertificationDraft {
  return {
    name: cert.name ?? '',
    issuer: cert.issuer ?? '',
    category: cert.category ?? '',
    skills: cert.skills ?? [],
    issuedAt: month(cert.issuedAt),
    expiresAt: month(cert.expiresAt),
    // A saved certification with an issue date but no expiry was saved as "does not expire".
    noExpiry: Boolean(cert.issuedAt && !cert.expiresAt),
    credentialUrl: cert.credentialUrl ?? '',
    credentialId: cert.credentialId ?? '',
  }
}

/** Problems that stop saving, worded for the person filling the form. */
export function certificationProblems(draft: CertificationDraft, position: number, today = new Date()): string[] {
  const label = draft.name.trim() || `Certification ${position}`
  const problems: string[] = []
  if (!draft.name.trim()) problems.push(`${label}: add the certification name.`)
  if (!draft.issuer.trim()) problems.push(`${label}: add the issuing organization.`)
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (draft.issuedAt && draft.issuedAt > thisMonth) problems.push(`${label}: the issue date is in the future.`)
  if (!draft.noExpiry && draft.issuedAt && draft.expiresAt && draft.expiresAt < draft.issuedAt) {
    problems.push(`${label}: the expiry date is before the issue date.`)
  }
  if (draft.credentialUrl.trim() && !/^https?:\/\/\S+$/i.test(draft.credentialUrl.trim())) {
    problems.push(`${label}: the credential URL must start with http:// or https://.`)
  }
  return problems
}

export function allCertificationProblems(drafts: CertificationDraft[]) {
  return drafts.flatMap((draft, index) => certificationProblems(draft, index + 1))
}

/** What the API takes: empty rows dropped, months as the first day, no expiry when "does not expire". */
export function certificationPayload(drafts: CertificationDraft[]): Array<Omit<ProfileCertification, 'id'>> {
  return drafts
    .filter((draft) => draft.name.trim() || draft.issuer.trim())
    .map((draft, sortOrder) => {
      const payload: Omit<ProfileCertification, 'id'> = {
        name: draft.name.trim(),
        issuer: draft.issuer.trim(),
        skills: draft.skills,
        sortOrder,
      }
      if (draft.category) payload.category = draft.category
      if (draft.issuedAt) payload.issuedAt = `${draft.issuedAt}-01`
      if (!draft.noExpiry && draft.expiresAt) payload.expiresAt = `${draft.expiresAt}-01`
      if (draft.credentialUrl.trim()) payload.credentialUrl = draft.credentialUrl.trim()
      if (draft.credentialId.trim()) payload.credentialId = draft.credentialId.trim()
      return payload
    })
}

/** "Expired" once the expiry month has passed. */
export function isCertificationExpired(cert: Pick<ProfileCertification, 'expiresAt'>, today = new Date()) {
  if (!cert.expiresAt) return false
  const expires = new Date(cert.expiresAt)
  // Valid through the whole expiry month.
  return new Date(expires.getFullYear(), expires.getMonth() + 1, 1) <= today
}

export function formatCertificationMonth(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}
