import { apiClient } from '@/shared/api/client'
import { definedParams } from '@/shared/api/endpoints/params'
import { walletKeys } from '@/shared/api/query-keys'
import { ledgerEntrySchema, topUpResultSchema, walletSummarySchema, type LedgerEntryView, type TopUpResult, type WalletSummary } from '@/shared/schemas'
import { contentOf, parsePage, type Paginated } from '@/features/contracts/api'

export { walletKeys }

/** The credit wallet calls. A wallet is made with 5,000 demo credits on the first call. */
export const walletApi = {
  summary: async (): Promise<WalletSummary> => walletSummarySchema.parse(contentOf((await apiClient.get('/api/wallet')).data)),

  ledger: async (p: { page: number; pageSize: number }): Promise<Paginated<LedgerEntryView>> =>
    parsePage((await apiClient.get('/api/wallet/ledger', { params: definedParams(p) })).data, ledgerEntrySchema),

  /** Starts a VNPay (test money) top up. Then send the browser to payUrl. */
  startTopUp: async (credits: number): Promise<{ topUpId: number; payUrl: string }> => {
    const content = contentOf<{ topUpId: number; payUrl: string }>((await apiClient.post('/api/wallet/top-ups', { credits })).data)
    return { topUpId: content.topUpId, payUrl: content.payUrl }
  },

  /**
   * Checks the payment after VNPay sends the browser back. `query` is the return page's query string,
   * passed on exactly as it came (the signature covers every vnp_ value, so it must not be rebuilt).
   */
  topUpReturn: async (query: string): Promise<TopUpResult> => {
    const search = query.startsWith('?') ? query : `?${query}`
    return topUpResultSchema.parse(contentOf((await apiClient.get(`/api/wallet/top-ups/vnpay-return${search}`)).data))
  },
}
