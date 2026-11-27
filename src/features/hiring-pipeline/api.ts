/**
 * API client and helpers for the hiring pipeline feature (applications, offers, interviews, and call tokens).
 * Fetches and validates application lists, details, upcoming interviews, and status changes, and formats status labels and tracker steps.
 *
 * Calls: apiClient; definedParams; pipelineKeys; applicationDetailSchema; hiringApplicationStatusSchema; upcomingInterviewSchema
 * Used by:
 *   - 11 files, for example features/hiring-pipeline/components/applicants/applicant-panel.tsx, features/hiring-pipeline/components/applicants/applicants-page.tsx, features/hiring-pipeline/components/applicants/request-interview-dialog.tsx
 */

import { apiClient } from '@/shared/api/client'
import { definedParams } from '@/shared/api/endpoints/params'
import { pipelineKeys } from '@/shared/api/query-keys'
import {
  applicationDetailSchema,
  hiringApplicationStatusSchema,
  upcomingInterviewSchema,
  type ApplicationDetail,
  type ApplicationStatus,
  type UpcomingInterview,
} from '@/shared/schemas'

export { pipelineKeys }

/** The body of an interview request (1 to 3 start times, as ISO text in UTC). */
export type InterviewRequest = {
  mode: 'ONLINE' | 'ONSITE' | 'PHONE'
  proposedTimes: string[]
  /** Minutes, 15 to 120; the backend uses 45 when it is left out. */
  durationMinutes?: number
  /** Address, meeting link or phone number; needed for ONSITE. */
  location?: string
  note?: string
}

/** A page of results, as the backend sends it (only the keys we use). */
export type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number }

export type CallToken = { url: string; token: string; roomName: string; expiresAt: string }

const allStatuses = hiringApplicationStatusSchema.options

/** The backend wraps most answers as { message, content }; this takes the content out. */
function contentOf<T>(body: unknown): T {
  return (body as { content: T }).content
}

/** One application. A wrong shape throws here, so a screen never draws half-broken data. */
function parseDetail(body: unknown): ApplicationDetail {
  return applicationDetailSchema.parse(contentOf(body))
}

function parsePage(content: Record<string, unknown> | undefined): Paginated<ApplicationDetail> {
  const rows = Array.isArray(content?.data) ? content.data : []
  const num = (key: string, fallback: number) => (typeof content?.[key] === 'number' ? (content[key] as number) : fallback)
  return {
    data: rows.map((row) => applicationDetailSchema.parse(row)),
    total: num('total', num('totalRow', rows.length)),
    page: num('page', num('pageIndex', 1)),
    pageSize: num('pageSize', rows.length),
    totalPages: num('totalPages', 1),
  }
}

/** All 8 keys, with 0 for any the backend did not send. */
function parseCounts(raw: unknown): Record<ApplicationStatus, number> {
  const record = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return Object.fromEntries(
    allStatuses.map((status) => [status, typeof record[status] === 'number' ? record[status] : 0]),
  ) as Record<ApplicationStatus, number>
}

const applicationPath = (id: number, action: string) => `/api/applications/${id}/${action}`
const interviewPath = (id: number, action: string) => `/api/interviews/${id}/${action}`

/**
 * The hiring pipeline calls (apply, shortlist, interview, offer, hired). Actions answer with the whole
 * application, so a screen can replace what it shows with one result.
 */
export const pipelineApi = {
  // Backend: GET /api/applications/:id → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts findOne()
  detail: async (id: number) => parseDetail((await apiClient.get(`/api/applications/${id}`)).data),

  // Backend: GET /api/hiring-posts/:id/applications → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findApplicationsForPost()
  list: async (postId: number, p: { status?: ApplicationStatus; page: number; pageSize: number }) => {
    const body = (await apiClient.get(`/api/hiring-posts/${postId}/applications`, { params: definedParams(p) })).data
    const content = contentOf<Record<string, unknown> | undefined>(body)
    const page = parsePage(content)
    return { data: page.data, counts: parseCounts(content?.counts), totalPages: page.totalPages }
  },

  // Backend: GET /api/hiring-posts/applications/me → NestjsBE/src/modules/hiring-posts/services/hiring-posts.service.ts findMyApplications()
  mine: async (p: { page: number; pageSize: number }) => {
    const body = (await apiClient.get('/api/hiring-posts/applications/me', { params: definedParams(p) })).data
    return parsePage(contentOf<Record<string, unknown> | undefined>(body))
  },

  // Backend: POST /api/applications/:id/shortlist → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts shortlist()
  shortlist: async (id: number) => parseDetail((await apiClient.post(applicationPath(id, 'shortlist'))).data),
  // Backend: POST /api/applications/:id/reject → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts reject()
  reject: async (id: number, note?: string) =>
    parseDetail((await apiClient.post(applicationPath(id, 'reject'), definedParams({ note }))).data),
  // Backend: POST /api/applications/:id/offer → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts sendOffer()
  offer: async (id: number, note?: string) =>
    parseDetail((await apiClient.post(applicationPath(id, 'offer'), definedParams({ note }))).data),
  // Backend: POST /api/applications/:id/offer/withdraw → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts withdrawOffer()
  withdrawOffer: async (id: number) => parseDetail((await apiClient.post(applicationPath(id, 'offer/withdraw'))).data),
  // Backend: POST /api/applications/:id/offer/accept → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts acceptOffer()
  acceptOffer: async (id: number) => parseDetail((await apiClient.post(applicationPath(id, 'offer/accept'))).data),
  // Backend: POST /api/applications/:id/offer/decline → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts declineOffer()
  declineOffer: async (id: number, note?: string) =>
    parseDetail((await apiClient.post(applicationPath(id, 'offer/decline'), definedParams({ note }))).data),
  // Backend: POST /api/applications/:id/withdraw → NestjsBE/src/modules/hiring-pipeline/services/applications.service.ts withdraw()
  withdraw: async (id: number) => parseDetail((await apiClient.post(applicationPath(id, 'withdraw'))).data),

  // Backend: POST /api/applications/:id/interviews → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts requestInterview()
  requestInterview: async (appId: number, body: InterviewRequest) =>
    parseDetail((await apiClient.post(applicationPath(appId, 'interviews'), body)).data),
  // Backend: POST /api/interviews/:id/times → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts proposeTimes()
  proposeTimes: async (interviewId: number, times: string[]) =>
    parseDetail((await apiClient.post(interviewPath(interviewId, 'times'), { proposedTimes: times })).data),
  // Backend: POST /api/interviews/:id/accept → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts accept()
  pickTime: async (interviewId: number, startsAt: string) =>
    parseDetail((await apiClient.post(interviewPath(interviewId, 'accept'), { startsAt })).data),
  // Backend: POST /api/interviews/:id/reschedule → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts requestReschedule()
  askOtherTimes: async (interviewId: number, note?: string) =>
    parseDetail((await apiClient.post(interviewPath(interviewId, 'reschedule'), definedParams({ note }))).data),
  // Backend: POST /api/interviews/:id/cancel → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts cancel()
  cancelInterview: async (interviewId: number, note?: string) =>
    parseDetail((await apiClient.post(interviewPath(interviewId, 'cancel'), definedParams({ note }))).data),
  // Backend: POST /api/interviews/:id/complete → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts complete()
  completeInterview: async (interviewId: number) =>
    parseDetail((await apiClient.post(interviewPath(interviewId, 'complete'))).data),

  // Backend: GET /api/interviews/upcoming → NestjsBE/src/modules/hiring-pipeline/services/interviews.service.ts upcoming()
  upcoming: async (): Promise<UpcomingInterview[]> => {
    const content = contentOf<unknown>((await apiClient.get('/api/interviews/upcoming')).data)
    return (Array.isArray(content) ? content : []).map((row) => upcomingInterviewSchema.parse(row))
  },

  /** A pass to join the video call. The backend answers this one without a { message, content } wrapper. */
  // Backend: POST /api/interviews/:id/call-token → NestjsBE/src/modules/hiring-pipeline/services/video-call.service.ts callToken()
  callToken: async (interviewId: number): Promise<CallToken> =>
    (await apiClient.post<CallToken>(interviewPath(interviewId, 'call-token'))).data,
}

const labels: Record<ApplicationStatus, string> = {
  APPLIED: 'New',
  REVIEWING: 'Shortlisted',
  INTERVIEWING: 'Interview',
  OFFERED: 'Offer sent',
  HIRED: 'Hired',
  REJECTED: 'Not selected',
  DECLINED: 'Offer declined',
  WITHDRAWN: 'Withdrawn',
}

/**
 * The words for a status. The recruiter sent the offer; the candidate received it.
 * A rejected application swept by the server shows why: "Position filled" or "Post closed".
 */
export function statusLabel(status: ApplicationStatus, viewer: 'recruiter' | 'candidate', reason?: string | null): string {
  if (status === 'OFFERED' && viewer === 'candidate') return 'Offer received'
  if (status === 'REJECTED') {
    if (reason === 'POSITION_FILLED') return 'Position filled'
    if (reason === 'POST_CLOSED') return 'Post closed'
  }
  return labels[status]
}

/**
 * Where the candidate's tracker (Applied, Shortlisted, Interview, Offer, Hired) stands, 0 to 4.
 * A declined offer was an offer, so it stays on step 3. Rejected and withdrawn applications did not
 * get past the start as far as this function knows (it only sees the status), so they read 0.
 */
export function trackerStep(status: ApplicationStatus): 0 | 1 | 2 | 3 | 4 {
  switch (status) {
    case 'REVIEWING':
      return 1
    case 'INTERVIEWING':
      return 2
    case 'OFFERED':
    case 'DECLINED':
      return 3
    case 'HIRED':
      return 4
    default:
      return 0
  }
}
