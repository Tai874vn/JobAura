import type { FoundSkill } from '@/shared/api/endpoints/users'
import type { UserResume } from '@/shared/schemas'

/**
 * The backend evaluates resumes in a queue: saving never waits for the AI service. These helpers read the
 * queue state stored on the resume.
 */
export type ResumeAiStatus = 'QUEUED' | 'PROCESSING' | 'DONE' | 'AI_UNAVAILABLE' | 'NEEDS_INPUT' | 'FAILED'

export function resumeAiStatus(resume?: UserResume | null): ResumeAiStatus | null {
  const status = resume?.aiStatus
  return status === 'QUEUED' || status === 'PROCESSING' || status === 'DONE' || status === 'AI_UNAVAILABLE'
    || status === 'NEEDS_INPUT' || status === 'FAILED'
    ? status
    : null
}

export function isResumeAiPending(resume?: UserResume | null) {
  const status = resumeAiStatus(resume)
  return status === 'QUEUED' || status === 'PROCESSING'
}

/** Whether the user should be offered "Try again". */
export function canRetryResumeAi(resume?: UserResume | null) {
  const status = resumeAiStatus(resume)
  return status === 'AI_UNAVAILABLE' || status === 'FAILED'
}

/** Skills the AI queue found in the CV text that the user hasn't chosen yet. */
export function suggestedSkills(resume?: UserResume | null): FoundSkill[] {
  const found = resume?.aiInsights?.suggestedSkills
  if (!Array.isArray(found)) return []
  return found.filter((skill): skill is FoundSkill =>
    Boolean(skill) && typeof skill === 'object' && typeof (skill as FoundSkill).name === 'string'
    && typeof (skill as FoundSkill).id === 'string')
    .map((skill) => ({ ...skill, matched: Array.isArray(skill.matched) ? skill.matched : [] }))
}

/** Skill names the dictionary didn't recognise, so the user can replace them. */
export function unrecognisedSkills(resume?: UserResume | null): string[] {
  const names = resume?.aiInsights?.unrecognisedSkills
  return Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string') : []
}
