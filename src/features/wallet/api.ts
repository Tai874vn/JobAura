import { apiClient } from '@/shared/api/client'
import { definedParams } from '@/shared/api/endpoints/params'
import { walletKeys } from '@/shared/api/query-keys'
import { ledgerEntrySchema, topUpResultSchema, walletSummarySchema, type LedgerEntryView, type TopUpResult, type WalletSummary } from '@/shared/schemas'
import { contentOf, parsePage, type Paginated } from '@/features/contracts/api'

export { walletKeys }

/** The credit wallet calls. A wallet is made with 5,000 demo credits on the first call. */
export const walletApi = {
  // Backend: GET /api/wallet → NestjsBE/src/modules/wallet/services/wallet.service.ts summary()
  summary: async (): Promise<WalletSummary> => walletSummarySchema.parse(contentOf((await apiClient.get('/api/wallet')).data)),

  // Backend: GET /api/wallet/ledger → NestjsBE/src/modules/wallet/services/wallet.service.ts ledger()
  ledger: async (p: { page: number; pageSize: number }): Promise<Paginated<LedgerEntryView>> =>
    parsePage((await apiClient.get('/api/wallet/ledger', { params: definedParams(p) })).data, ledgerEntrySchema),

  /** Starts a Stripe Checkout (test mode) top up. Then send the browser to checkoutUrl with openCheckout. */
  // Backend: POST /api/wallet/top-ups → NestjsBE/src/modules/wallet/services/top-ups.service.ts start()
  startTopUp: async (credits: number): Promise<{ topUpId: number; checkoutUrl: string }> => {
    const content = contentOf<{ topUpId: number; checkoutUrl: string }>((await apiClient.post('/api/wallet/top-ups', { credits })).data)
    return { topUpId: content.topUpId, checkoutUrl: content.checkoutUrl }
  },

  /** The state of one of my top ups. The server asks Stripe itself when its webhook is late. */
  // Backend: GET /api/wallet/top-ups/:id → NestjsBE/src/modules/wallet/services/top-ups.service.ts status()
  topUpStatus: async (topUpId: number): Promise<TopUpResult> =>
    topUpResultSchema.parse(contentOf((await apiClient.get(`/api/wallet/top-ups/${topUpId}`)).data)),
}

/** The only place a top up may send the browser: Stripe's hosted Checkout page. */
export const STRIPE_CHECKOUT_ORIGIN = 'https://checkout.stripe.com'

/** Leaves the site for Stripe Checkout. Any other address is refused (defence in depth). */
export function openCheckout(checkoutUrl: string, go: (url: string) => void = (url) => window.location.assign(url)): void {
  const url = new URL(checkoutUrl)
  if (url.origin !== STRIPE_CHECKOUT_ORIGIN) throw new Error('Unexpected payment page')
  go(url.toString())
}
