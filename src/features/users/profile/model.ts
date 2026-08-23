import type { User, UserProfile } from '@/shared/schemas'

export type ProfileSkill = {
  id?: number
  name: string
  level?: string | null
  sortOrder?: number | null
}

export type Certification = {
  id?: number
  name: string
  issuer?: string | null
  issuedAt?: string | null
  expiresAt?: string | null
  credentialUrl?: string | null
  credentialId?: string | null
  sortOrder?: number | null
}

export type PortfolioItem = {
  id?: number
  title: string
  description?: string | null
  image?: string | null
  url?: string | null
  sortOrder?: number | null
}

export type SkillDraft = Omit<ProfileSkill, 'id'>
export type CertificationDraft = Omit<Certification, 'id'>
export type ProfileEditPanel = 'profile' | 'skills' | 'certifications' | 'resume' | null

export type MarketplaceProfile = User & {
  headline?: string | null
  bio?: string | null
  location?: string | null
  website?: string | null
  cover?: string | null
  coverImage?: string | null
  skills?: ProfileSkill[] | null
  profileSkills?: ProfileSkill[] | null
  certifications?: Certification[] | null
  profileCertifications?: Certification[] | null
  portfolio?: PortfolioItem[] | null
  portfolioItems?: PortfolioItem[] | null
}

export const emptySkill: SkillDraft = { name: '', level: '', sortOrder: 0 }
export const emptyCertification: CertificationDraft = {
  name: '',
  issuer: '',
  issuedAt: '',
  expiresAt: '',
  credentialUrl: '',
  credentialId: '',
  sortOrder: 0,
}

export function getProfileSkills(profile: MarketplaceProfile | UserProfile): ProfileSkill[] {
  return sortByOrder(profile.profileSkills ?? profile.skills ?? legacySkills(profile.skill))
}

export function getProfileCertifications(profile: MarketplaceProfile | UserProfile): Certification[] {
  return sortByOrder(profile.profileCertifications ?? profile.certifications ?? legacyCertifications(profile.certification))
}
function legacySkills(value?: string | null): ProfileSkill[] {
  if (!value) return []
  return value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, sortOrder) => ({ name, sortOrder }))
}

function legacyCertifications(value?: string | null): Certification[] {
  if (!value) return []
  return value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name, sortOrder) => ({ name, sortOrder }))
}

export function sortByOrder<T extends { sortOrder?: number | null }>(items: T[]) {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(date)
}

export function formatFullDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function humanize(value: string) {
  return value.replace(/[_-]/g, ' ')
}
