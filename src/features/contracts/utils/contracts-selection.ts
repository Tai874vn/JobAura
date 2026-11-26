import { contractsConfig } from '@/page-config/contracts'
import type { ContractListItem, ContractStatus, ProposalListItem, ProposalStatus, Side } from '@/shared/schemas'

/** The chips above the list. */
export type ContractFilter = 'all' | 'proposals' | 'active' | 'completed' | 'ended'

export const contractFilters: { key: ContractFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'proposals', label: 'Proposals' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'ended', label: 'Ended' },
]

/** Set in src/page-config/contracts.ts (tabs). */
export const contractTabs: readonly { key: Side; label: string }[] = contractsConfig.tabs

/** What is open on the right: one proposal or one contract. */
export type Selection = { kind: 'proposal' | 'contract'; id: number }

export type Row =
  | { kind: 'proposal'; id: number; updatedAt: string; item: ProposalListItem }
  | { kind: 'contract'; id: number; updatedAt: string; item: ContractListItem }

/** The address with some keys set (a string) or removed (null). Pure, so the page and its tests build the same links. */
export function hrefWith(pathname: string, search: string, next: Record<string, string | null>): string {
  const url = new URLSearchParams(search)
  for (const [key, value] of Object.entries(next)) {
    if (value === null) url.delete(key)
    else url.set(key, value)
  }
  const out = url.toString()
  return out ? `${pathname}?${out}` : pathname
}

export const positiveId = (value: string | null) => (value && /^[1-9]\d{0,9}$/.test(value) ? Number(value) : null)

export type PageParams = {
  /** The tab in the address, or null when the address has none (a notification link). */
  tab: Side | null
  filter: ContractFilter
  selection: Selection | null
}

/** Reads ?tab=, ?filter=, ?proposal= and ?contract= (a wrong value falls back; when both ids are given the contract wins). */
export function parsePageParams(search: URLSearchParams): PageParams {
  const tabParam = search.get('tab')
  const filterParam = search.get('filter')
  const contractId = positiveId(search.get('contract'))
  const proposalId = positiveId(search.get('proposal'))
  return {
    tab: tabParam === 'client' || tabParam === 'freelancer' ? tabParam : null,
    filter: contractFilters.some((f) => f.key === filterParam) ? (filterParam as ContractFilter) : 'all',
    selection: contractId !== null ? { kind: 'contract', id: contractId } : proposalId !== null ? { kind: 'proposal', id: proposalId } : null,
  }
}

/**
 * Which tab is shown. The address wins; with none (a notification link) the viewer's side on the opened item is used,
 * so the list beside it holds that item; otherwise "As client".
 */
export function resolveTab(tabInAddress: Side | null, openedViewerRole: Side | null | undefined): Side {
  return tabInAddress ?? openedViewerRole ?? 'client'
}

/** What the list asks the server for: which of the two lists, and the status filter of each. */
export function listPlan(filter: ContractFilter): { proposals: ProposalStatus | 'any' | null; contracts: ContractStatus | 'any' | null } {
  switch (filter) {
    case 'all':
      // Open proposals first, then every contract.
      return { proposals: 'OPEN', contracts: 'any' }
    case 'proposals':
      return { proposals: 'any', contracts: null }
    case 'active':
      return { proposals: null, contracts: 'ACTIVE' }
    case 'completed':
      return { proposals: null, contracts: 'COMPLETED' }
    case 'ended':
      return { proposals: null, contracts: 'ENDED' }
  }
}

const byNewest = (a: Row, b: Row) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : b.id - a.id)

/** The list rows. "All": open proposals first, then contracts by last change. Other chips: newest change first. */
export function buildRows(filter: ContractFilter, proposals: ProposalListItem[], contracts: ContractListItem[]): Row[] {
  const proposalRows: Row[] = proposals.map((item) => ({ kind: 'proposal', id: item.id, updatedAt: item.updatedAt, item }))
  const contractRows: Row[] = contracts.map((item) => ({ kind: 'contract', id: item.id, updatedAt: item.updatedAt, item }))
  if (filter === 'all') return [...proposalRows.sort(byNewest), ...contractRows.sort(byNewest)]
  return [...proposalRows, ...contractRows].sort(byNewest)
}

/** The item that is open: the one in the address, else the first row (wide screens always show one). */
export function resolveSelection(fromAddress: Selection | null, rows: Row[]): Selection | null {
  if (fromAddress) return fromAddress
  const first = rows[0]
  return first ? { kind: first.kind, id: first.id } : null
}

/** How long until a time, as words: "in 6 days", "in 3 hours", "in under an hour", "expired". */
export function expiresIn(iso: string, now: number = Date.now()): string {
  const ms = new Date(iso).getTime() - now
  if (Number.isNaN(ms)) return ''
  if (ms <= 0) return 'expired'
  const hours = ms / 3_600_000
  if (hours < 1) return 'in under an hour'
  if (hours < 24) {
    const n = Math.floor(hours)
    return `in ${n} ${n === 1 ? 'hour' : 'hours'}`
  }
  const days = Math.floor(hours / 24)
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}
