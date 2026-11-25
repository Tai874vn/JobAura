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

  /** Starts a SePay (test money) top up. Then post the signed form with submitCheckoutForm. */
  startTopUp: async (credits: number): Promise<{ topUpId: number; checkout: CheckoutForm }> => {
    const content = contentOf<{ topUpId: number; checkout: CheckoutForm }>((await apiClient.post('/api/wallet/top-ups', { credits })).data)
    return { topUpId: content.topUpId, checkout: content.checkout }
  },

  /** The state of one of my top ups. The server asks SePay itself when its IPN is late. */
  topUpStatus: async (topUpId: number): Promise<TopUpResult> =>
    topUpResultSchema.parse(contentOf((await apiClient.get(`/api/wallet/top-ups/${topUpId}`)).data)),
}

/** The signed form the server gives back; it must be posted as it is (the signature covers it). */
export type CheckoutForm = { action: string; fields: Record<string, string> }

/** The only places a checkout form may be posted to (also listed in the CSP form-action). */
export const SEPAY_CHECKOUT_ORIGINS = ['https://pay.sepay.vn', 'https://pay-sandbox.sepay.vn']

/**
 * SePay's checkout only takes an HTML form POST, so a hidden form is built and submitted.
 * The browser leaves this site. An action on any other host is refused.
 */
export function submitCheckoutForm(checkout: CheckoutForm, doc: Document = document): void {
  const url = new URL(checkout.action)
  if (!SEPAY_CHECKOUT_ORIGINS.includes(url.origin)) throw new Error('Unexpected payment page')
  const form = doc.createElement('form')
  form.method = 'POST'
  form.action = url.toString()
  form.style.display = 'none'
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = doc.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }
  doc.body.appendChild(form)
  form.submit()
}
