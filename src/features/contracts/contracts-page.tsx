'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useSession } from '@/features/auth/use-session'
import { cn } from '@/shared/lib/utils'
import type { ContractStatus, ProposalStatus, Side } from '@/shared/schemas'
import { Button, ButtonLink, EmptyState } from '@/shared/ui'
import { contractKeys, contractsApi } from './api'
import { ContractListItem } from './contract-list-item'
import { ContractPanel } from './contract-panel'
import { ContractsListSkeleton } from './contracts-skeleton'
import {
  buildRows,
  hrefWith,
  contractFilters,
  contractTabs,
  listPlan,
  parsePageParams,
  resolveSelection,
  resolveTab,
  type ContractFilter,
  type Row,
} from './contracts-selection'
import { PanelLoading } from './panel-frame'
import { ProposalPanel } from './proposal-panel'

/** The lists show the newest 50 of each kind (the server's largest page). */
export const contractsPageSize = 50

/** What each list asks the server for. The page and its tests both build the query keys from this. */
export function contractsListParams(viewerId: number, role: Side, status: string | undefined) {
  return { viewerId, role, status, page: 1, pageSize: contractsPageSize }
}

function isMissing(error: unknown) {
  return error instanceof AxiosError && (error.response?.status === 404 || error.response?.status === 403)
}

const emptyText: Record<ContractFilter, string> = {
  all: 'Nothing here yet. Send a proposal from a service page to start.',
  proposals: 'No proposals here.',
  active: 'No active contracts.',
  completed: 'No completed contracts.',
  ended: 'No ended contracts.',
}

/**
 * The person's proposals and contracts. Wide screens are one screen tall: the list scrolls on the left and the
 * open item stays in view on the right. Phones show the list, and a tap opens the item as its own view with a Back
 * link. The tab, the chip and the open item live in the address (?tab=, ?filter=, ?proposal=, ?contract=), so
 * notification links and refreshes land on the same item.
 */
export function ContractsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useSession()
  const viewerId = user?.id ?? 0

  const params = useMemo(() => parsePageParams(searchParams), [searchParams])
  const filter = params.filter
  const fromAddress = params.selection

  const hrefFor = (next: Record<string, string | null>) => hrefWith(pathname, searchParams.toString(), next)
  const go = (next: Record<string, string | null>, mode: 'push' | 'replace' = 'replace') =>
    router[mode](hrefFor(next), { scroll: false })

  // The opened item is read first: with no ?tab= (a notification link) its side picks the tab.
  const openedProposal = useQuery({
    queryKey: contractKeys.proposal(fromAddress?.kind === 'proposal' ? fromAddress.id : 0, user?.id),
    queryFn: () => contractsApi.proposal(fromAddress?.id as number),
    enabled: Boolean(user) && fromAddress?.kind === 'proposal',
    staleTime: 15_000,
  })
  const openedContract = useQuery({
    queryKey: contractKeys.contract(fromAddress?.kind === 'contract' ? fromAddress.id : 0, user?.id),
    queryFn: () => contractsApi.contract(fromAddress?.id as number),
    enabled: Boolean(user) && fromAddress?.kind === 'contract',
    staleTime: 15_000,
  })
  const tab = resolveTab(params.tab, (fromAddress?.kind === 'proposal' ? openedProposal.data : openedContract.data)?.viewerRole)

  const plan = listPlan(filter)
  const proposalStatus: ProposalStatus | undefined = plan.proposals === 'OPEN' ? 'OPEN' : undefined
  const contractStatus: ContractStatus | undefined = plan.contracts === 'any' || plan.contracts === null ? undefined : plan.contracts
  const proposalParams = contractsListParams(viewerId, tab, proposalStatus)
  const contractParams = contractsListParams(viewerId, tab, contractStatus)
  const proposalsList = useQuery({
    // The keys carry the person and the side, so one person never sees another person's cached list.
    queryKey: contractKeys.proposals(proposalParams),
    queryFn: () => contractsApi.proposals({ role: tab, status: proposalStatus, page: 1, pageSize: contractsPageSize }),
    enabled: Boolean(user) && plan.proposals !== null,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
  const contractsList = useQuery({
    queryKey: contractKeys.contracts(contractParams),
    queryFn: () => contractsApi.contracts({ role: tab, status: contractStatus, page: 1, pageSize: contractsPageSize }),
    enabled: Boolean(user) && plan.contracts !== null,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const proposalsData = proposalsList.data?.data
  const contractsData = contractsList.data?.data
  const rows: Row[] = useMemo(() => {
    const activePlan = listPlan(params.filter)
    return buildRows(
      params.filter,
      activePlan.proposals !== null ? (proposalsData ?? []) : [],
      activePlan.contracts !== null ? (contractsData ?? []) : [],
    )
  }, [params, proposalsData, contractsData])
  const queries = [plan.proposals !== null ? proposalsList : null, plan.contracts !== null ? contractsList : null].filter((q) => q !== null)
  const isPending = queries.some((q) => q.isPending)
  const isPlaceholderData = queries.some((q) => q.isPlaceholderData)
  const isError = queries.some((q) => q.isError)
  const capped = (proposalsList.data && plan.proposals !== null && proposalsList.data.total > contractsPageSize) || (contractsList.data && plan.contracts !== null && contractsList.data.total > contractsPageSize)

  // Wide screens always have one open; phones only open a view after a tap (an id in the address).
  // Skip auto-selecting stale rows from the previous tab/filter while placeholder data is still settling.
  const selection = resolveSelection(fromAddress, isPlaceholderData && fromAddress === null ? [] : rows)
  const phoneView = fromAddress !== null
  const selectedProposal = useQuery({
    queryKey: contractKeys.proposal(selection?.kind === 'proposal' ? selection.id : 0, user?.id),
    queryFn: () => contractsApi.proposal(selection?.id as number),
    enabled: Boolean(user) && selection?.kind === 'proposal',
    staleTime: 15_000,
  })
  const selectedContract = useQuery({
    queryKey: contractKeys.contract(selection?.kind === 'contract' ? selection.id : 0, user?.id),
    queryFn: () => contractsApi.contract(selection?.id as number),
    enabled: Boolean(user) && selection?.kind === 'contract',
    staleTime: 15_000,
  })

  // The tab may come from the opened item (no ?tab=): write it, so Back, the chips and the new contract keep it.
  const backHref = hrefFor({ proposal: null, contract: null, tab })
  const hrefOf = (row: Row) => hrefFor(row.kind === 'proposal' ? { proposal: String(row.id), contract: null, tab } : { contract: String(row.id), proposal: null, tab })
  const select = (row: Row) => go(row.kind === 'proposal' ? { proposal: String(row.id), contract: null, tab } : { contract: String(row.id), proposal: null, tab }, 'push')
  const contractHref = (id: number) => hrefFor({ contract: String(id), proposal: null, tab })

  function panel() {
    if (!user) return null
    if (!selection) {
      return isPending || isPlaceholderData ? <PanelLoading backHref={backHref} /> : null
    }
    const detail = selection.kind === 'proposal' ? selectedProposal : selectedContract
    const row = rows.find((r) => r.kind === selection.kind && r.id === selection.id)
    const rowTitle = row ? (row.kind === 'proposal' ? row.item.job.title : row.item.title) : undefined
    if (detail.isError) {
      return isMissing(detail.error) ? (
        <EmptyState title="Could not open this item" description="It does not exist, or it is not yours." action={<ButtonLink href="/contracts" variant="secondary">All contracts</ButtonLink>} />
      ) : (
        <EmptyState title="Could not open this item" description="Check your connection and try again." action={<Button onClick={() => void detail.refetch()}>Try again</Button>} />
      )
    }
    const data = detail.data
    if (!data || data.id !== selection.id) return <PanelLoading backHref={backHref} title={rowTitle} />
    if (selection.kind === 'proposal') {
      const proposal = selectedProposal.data
      if (!proposal) return null
      return (
        <ProposalPanel
          key={proposal.id}
          proposal={proposal}
          viewerId={user.id}
          backHref={backHref}
          contractHref={contractHref}
          // Accepting made a contract: the page opens it (the proposal was just read again, so Back shows the new list).
          onAccepted={(contractId) => go({ proposal: null, contract: String(contractId), tab })}
        />
      )
    }
    const contract = selectedContract.data
    return contract ? <ContractPanel key={contract.id} contract={contract} viewerId={user.id} backHref={backHref} /> : null
  }

  return (
    <div className="hiring-theme flex flex-col bg-background text-foreground lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
      <div className="container-page flex min-h-0 flex-1 flex-col pb-6 pt-6 lg:pb-4">
        <div className="flex-none">
          <h1 className="font-display text-2xl font-medium leading-tight sm:text-3xl">Contracts</h1>

          <div role="tablist" aria-label="Your side" className="-mx-1 mt-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-1">
            {contractTabs.map(({ key, label }) => {
              const active = key === tab
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => go({ tab: key, proposal: null, contract: null })}
                  className={cn(
                    '-mb-px inline-flex shrink-0 items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-bright',
                    active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div role="group" aria-label="Show" className="mt-3 flex flex-wrap gap-2">
            {contractFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={key === filter}
                onClick={() => go({ filter: key === 'all' ? null : key, proposal: null, contract: null, tab })}
                className={cn(
                  'interaction rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright',
                  key === filter ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-h-0 min-w-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1.5">
            {isPending ? (
              <ContractsListSkeleton />
            ) : isError ? (
              <EmptyState
                title="Could not load your contracts"
                description="Check your connection and try again."
                action={<Button onClick={() => { void proposalsList.refetch(); void contractsList.refetch() }}>Try again</Button>}
              />
            ) : rows.length ? (
              <ul className={cn('grid gap-2 transition-opacity duration-200', isPlaceholderData && 'opacity-60')} role="listbox" aria-busy={isPlaceholderData} aria-label="Proposals and contracts">
                {rows.map((row) => (
                  <li key={`${row.kind}-${row.id}`} role="option" aria-selected={selection?.kind === row.kind && selection.id === row.id}>
                    <ContractListItem
                      row={row}
                      viewerId={viewerId}
                      href={hrefOf(row)}
                      selected={selection?.kind === row.kind && selection.id === row.id}
                      onSelect={() => select(row)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-muted">{emptyText[filter]}</p>
            )}
            {capped ? <p className="mt-3 text-center text-xs text-muted">Showing the newest {contractsPageSize} of each list.</p> : null}
          </div>

          <div className={cn('min-h-0 min-w-0', phoneView ? 'max-lg:motion-drawer fixed inset-x-0 bottom-0 top-16 z-30 overflow-hidden bg-background lg:static lg:z-auto lg:bg-transparent' : 'hidden lg:block')}>
            {panel()}
          </div>
        </div>
      </div>
    </div>
  )
}
