import { apiClient, uploadClient } from '@/shared/api/client'
import { definedParams } from '@/shared/api/endpoints/params'
import { contractKeys } from '@/shared/api/query-keys'
import { assertValidImageFile } from '@/shared/lib/file-validation'
import {
  contractDetailSchema,
  contractListItemSchema,
  proposalDetailSchema,
  proposalListItemSchema,
  type AmendmentChange,
  type ContractDetail,
  type ContractListItem,
  type ContractStatus,
  type CreateProposalBody,
  type EndChoice,
  type ProposalDetail,
  type ProposalListItem,
  type ProposalStatus,
  type Side,
  type VersionBody,
} from '@/shared/schemas'
import type { z } from 'zod'

export { contractKeys }

/** A page of results, as the backend sends it (only the keys we use). */
export type Paginated<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number }

/** The backend wraps answers as { message, content }; this takes the content out. */
export function contentOf<T>(body: unknown): T {
  return (body as { content: T }).content
}

/** Reads one page. A row with a wrong shape throws here, so a screen never draws half-broken data. */
export function parsePage<T>(body: unknown, schema: z.ZodType<T>): Paginated<T> {
  const content = contentOf<Record<string, unknown> | undefined>(body)
  const rows = Array.isArray(content?.data) ? content.data : []
  const num = (key: string, fallback: number) => (typeof content?.[key] === 'number' ? (content[key] as number) : fallback)
  return {
    data: rows.map((row) => schema.parse(row)),
    total: num('total', rows.length),
    page: num('page', 1),
    pageSize: num('pageSize', rows.length),
    totalPages: num('totalPages', 1),
  }
}

const parseProposal = (body: unknown): ProposalDetail => proposalDetailSchema.parse(contentOf(body))
const parseContract = (body: unknown): ContractDetail => contractDetailSchema.parse(contentOf(body))

const proposalPath = (id: number, action: string) => `/api/proposals/${id}/${action}`
const milestonePath = (id: number, action: string) => `/api/milestones/${id}/${action}`
const contractPath = (id: number, action: string) => `/api/contracts/${id}/${action}`
const amendmentPath = (id: number, action: string) => `/api/amendments/${id}/${action}`

type ListParams<S> = { role: Side; status?: S; page: number; pageSize: number }

/**
 * The service-contract calls: proposals, contracts, milestones, changes, ending, review.
 * Every action answers with the whole fresh proposal or contract, so a screen can replace what it shows.
 * The backend rejects unknown body fields (400), so each call sends only the documented fields.
 */
export const contractsApi = {
  proposals: async (p: ListParams<ProposalStatus>): Promise<Paginated<ProposalListItem>> =>
    parsePage((await apiClient.get('/api/proposals', { params: definedParams(p) })).data, proposalListItemSchema),
  proposal: async (id: number) => parseProposal((await apiClient.get(`/api/proposals/${id}`)).data),
  propose: async (body: CreateProposalBody) => parseProposal((await apiClient.post('/api/proposals', body)).data),
  counter: async (id: number, body: VersionBody) =>
    parseProposal((await apiClient.post(proposalPath(id, 'counter'), body)).data),
  accept: async (id: number, version: number) =>
    parseProposal((await apiClient.post(proposalPath(id, 'accept'), { version })).data),
  decline: async (id: number, note?: string) =>
    parseProposal((await apiClient.post(proposalPath(id, 'decline'), definedParams({ note }))).data),
  withdrawProposal: async (id: number) => parseProposal((await apiClient.post(proposalPath(id, 'withdraw'))).data),

  contracts: async (p: ListParams<ContractStatus>): Promise<Paginated<ContractListItem>> =>
    parsePage((await apiClient.get('/api/contracts', { params: definedParams(p) })).data, contractListItemSchema),
  contract: async (id: number) => parseContract((await apiClient.get(`/api/contracts/${id}`)).data),

  fund: async (milestoneId: number) => parseContract((await apiClient.post(milestonePath(milestoneId, 'fund'))).data),
  submit: async (milestoneId: number, body: { note: string; images: string[]; links: string[] }) =>
    parseContract((await apiClient.post(milestonePath(milestoneId, 'submit'), body)).data),
  requestChanges: async (milestoneId: number, note: string) =>
    parseContract((await apiClient.post(milestonePath(milestoneId, 'request-changes'), { note })).data),
  approve: async (milestoneId: number) =>
    parseContract((await apiClient.post(milestonePath(milestoneId, 'approve'))).data),
  /** The client ends the contract alone. Works only while no credits are held. */
  endNow: async (contractId: number) => parseContract((await apiClient.post(contractPath(contractId, 'end'))).data),

  proposeAmendment: async (contractId: number, body: { note?: string; deadline?: string; changes: AmendmentChange[] }) =>
    parseContract((await apiClient.post(contractPath(contractId, 'amendments'), body)).data),
  acceptAmendment: async (id: number) => parseContract((await apiClient.post(amendmentPath(id, 'accept'))).data),
  declineAmendment: async (id: number, note?: string) =>
    parseContract((await apiClient.post(amendmentPath(id, 'decline'), definedParams({ note }))).data),
  withdrawAmendment: async (id: number) => parseContract((await apiClient.post(amendmentPath(id, 'withdraw'))).data),

  requestEnd: async (contractId: number, body: { note?: string; submittedChoice?: EndChoice }) =>
    parseContract((await apiClient.post(contractPath(contractId, 'end-requests'), definedParams(body))).data),
  acceptEnd: async (contractId: number, submittedChoice?: EndChoice) =>
    parseContract((await apiClient.post(contractPath(contractId, 'end-requests/accept'), definedParams({ submittedChoice }))).data),
  declineEnd: async (contractId: number) =>
    parseContract((await apiClient.post(contractPath(contractId, 'end-requests/decline'))).data),
  withdrawEnd: async (contractId: number) =>
    parseContract((await apiClient.post(contractPath(contractId, 'end-requests/withdraw'))).data),

  /** Uploads one image (up to 5 MB). Put the returned url in referenceImages or a submission's images. */
  uploadImage: async (file: File): Promise<{ url: string }> => {
    assertValidImageFile(file, { label: 'Image' })
    const formData = new FormData()
    formData.append('file', file)
    const { url } = contentOf<{ url: string }>((await uploadClient.post('/api/contracts/attachments', formData)).data)
    return { url }
  },

  /** A review of a finished contract (the client only, once). */
  review: async (body: { contractId: number; content: string; rating: number }) =>
    contentOf<unknown>((await apiClient.post('/api/comments', body)).data),
}
