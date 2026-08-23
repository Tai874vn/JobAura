import { safeInternalPath } from './session-routing'

export const accountRoles = ['user', 'employer', 'admin'] as const
export const signupRoles = ['user', 'employer'] as const

export type AccountRole = (typeof accountRoles)[number]
export type SignupRole = (typeof signupRoles)[number]

export const signupRoleOptions: Array<{
  value: SignupRole
  label: string
  description: string
}> = [
  {
    value: 'user',
    label: 'Worker',
    description: 'Build a profile, post services, and receive job matches.',
  },
  {
    value: 'employer',
    label: 'Employer',
    description: 'Find candidates, review profiles, and start hiring conversations.',
  },
]

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && accountRoles.includes(value as AccountRole)
}

export function canAccessCandidateDirectory(role?: string | null) {
  return role === 'employer' || role === 'admin'
}

export function canAccessEmployeeTools(role?: string | null) {
  return role === 'user' || role === 'admin'
}

export function canAccessRole(role: string | null | undefined, allowedRoles?: readonly AccountRole[]) {
  if (!allowedRoles?.length) return true
  return isAccountRole(role) && allowedRoles.includes(role)
}

export function getSignedInRedirect(user?: { role?: string | null } | null, nextPath?: string | null) {
  const safeNextPath = safeInternalPath(nextPath)
  if (safeNextPath) return safeNextPath
  if (user?.role === 'admin') return '/admin'
  if (user?.role === 'employer') return '/candidates'
  return '/'
}
