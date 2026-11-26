import type { InterviewRequest } from '../api'

export const durationOptions = [15, 30, 45, 60, 90, 120] as const

/** What the person typed in the dialog. Times are `datetime-local` text, in the viewer's own time. */
export type InterviewDraft = {
  mode: InterviewRequest['mode']
  times: string[]
  durationMinutes: number
  location: string
  note: string
}

export type InterviewValidation = { request: InterviewRequest } | { error: string }

/**
 * Checks the draft the same way the server does (1 to 3 times, each in the future, all different, an address
 * for an onsite interview) and builds the request. Every message names the field. With `timesOnly` (the
 * recruiter sends new times for an interview that already exists) only the times are checked and sent.
 */
export function validateInterviewRequest(
  draft: InterviewDraft,
  now: Date = new Date(),
  options: { timesOnly?: boolean } = {},
): InterviewValidation {
  if (draft.times.length < 1 || draft.times.length > 3) return { error: 'Add 1 to 3 times.' }

  const stamps: number[] = []
  for (const [index, text] of draft.times.entries()) {
    const stamp = text ? new Date(text).getTime() : Number.NaN
    if (Number.isNaN(stamp)) return { error: `Time ${index + 1}: pick a date and a time.` }
    if (stamp <= now.getTime()) return { error: `Time ${index + 1} must be in the future.` }
    stamps.push(stamp)
  }
  if (new Set(stamps).size !== stamps.length) return { error: 'Times must all be different.' }

  const proposedTimes = stamps.map((stamp) => new Date(stamp).toISOString())
  if (options.timesOnly) return { request: { mode: draft.mode, proposedTimes } }

  const location = draft.location.trim()
  if (draft.mode === 'ONSITE' && !location) return { error: 'Address is needed for an onsite interview.' }

  const note = draft.note.trim()
  return {
    request: {
      mode: draft.mode,
      proposedTimes,
      durationMinutes: draft.durationMinutes,
      // An online interview happens inside JobAura, so it has no address.
      ...(draft.mode !== 'ONLINE' && location ? { location } : {}),
      ...(note ? { note } : {}),
    },
  }
}
