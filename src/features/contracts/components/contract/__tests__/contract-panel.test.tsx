import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { ContractDetail } from '@/shared/schemas'
import { ContractPanel } from '../contract-panel'
import { CLIENT, FREELANCER, contractOf, milestoneOf } from '../../../utils/contract-test-data'
import { FundError } from '../fund-error'
import { submitWorkErrors } from '../../dialogs/submit-work-dialog'

function render(contract: ContractDetail, viewerId: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <ContractPanel contract={contract} viewerId={viewerId} backHref="/contracts" />
    </QueryClientProvider>,
  )
}

const submission = (id: number, number: number, note: string, createdAt: string, extra: { images?: string[]; links?: string[]; feedback?: string | null } = {}) => ({
  id, number, note, images: extra.images ?? [], links: extra.links ?? [], feedback: extra.feedback ?? null, createdAt,
})

const ended = () =>
  contractOf(
    [
      milestoneOf(1, 'APPROVED', { amount: 1250, submissions: [submission(1, 1, 'First sketches', '2030-01-03T10:00:00.000Z', { links: ['https://files.example.com/a'] })] }),
      milestoneOf(2, 'CANCELLED', { amount: 750, submissions: [submission(2, 1, 'Colour drafts', '2030-01-08T10:00:00.000Z', { feedback: 'Warmer, please' })] }),
    ],
    { status: 'ENDED', endReason: 'MUTUAL', total: 2000, paid: 1250, held: 0, remaining: 0, endedAt: '2030-01-09T00:00:00.000Z' },
  )

describe('ContractPanel', () => {
  it('shows the four figures in credits', () => {
    const html = render(contractOf([milestoneOf(1, 'FUNDED', { amount: 1250 }), milestoneOf(2, 'PENDING', { amount: 750 })], { total: 2000, paid: 0, held: 1250, remaining: 750 }), CLIENT)
    for (const text of ['Total', 'Paid', 'Held', 'Remaining', '2,000 credits', '0 credits', '1,250 credits', '750 credits']) expect(html).toContain(text)
    expect(html).not.toMatch(/\$|USD|VND/)
  })

  it('keeps every submission of an ended contract visible to both sides, newest first', () => {
    for (const viewer of [CLIENT, FREELANCER]) {
      const html = render({ ...ended(), viewerRole: viewer === CLIENT ? 'client' : 'freelancer' }, viewer)
      expect(html).toContain('Ended by agreement')
      expect(html).toContain('Colour drafts')
      expect(html).toContain('First sketches')
      expect(html).toContain('Warmer, please')
      expect(html).toContain('files.example.com')
      expect(html.indexOf('Colour drafts')).toBeLessThan(html.indexOf('First sketches'))
      // A finished contract has no step buttons.
      expect(html).not.toContain('Propose a change')
      expect(html).not.toContain('Ask to end')
    }
  })

  it('offers the review to the client when canReview, and shows it once left', () => {
    expect(render({ ...ended(), canReview: true }, CLIENT)).toContain('Leave a review')
    const reviewed = render({ ...ended(), review: { id: 3, rating: 4, content: 'Clean work' } }, FREELANCER)
    expect(reviewed).toContain('Clean work')
    expect(reviewed).toContain('4 out of 5 stars')
    expect(reviewed).not.toContain('Leave a review')
  })

  it('shows the client the fund button with the amount, and the freelancer the submit button', () => {
    const c = contractOf([milestoneOf(1, 'PENDING', { amount: 1250 })])
    expect(render(c, CLIENT)).toContain('Fund milestone 1 (1,250 credits)')
    expect(render(c, CLIENT)).toContain('End contract')
    const funded = contractOf([milestoneOf(1, 'FUNDED', { amount: 1250 })], { held: 1250, viewerRole: 'freelancer' })
    const html = render(funded, FREELANCER)
    expect(html).toContain('Submit work')
    expect(html).toContain('Ask to end')
    expect(html).not.toContain('Fund milestone')
  })

  it('shows Approve with the amount released for submitted work', () => {
    const c = contractOf([milestoneOf(1, 'SUBMITTED', { amount: 1250, submittedAt: '2030-01-05T00:00:00.000Z' })], { held: 1250 })
    const html = render(c, CLIENT)
    expect(html).toContain('Approve and release 1,250 credits')
    expect(html).toContain('Request changes')
  })

  it('shows the open change request in words with Accept and Decline for the other side', () => {
    const c = contractOf([milestoneOf(1, 'PENDING', { amount: 500 })], {
      amendments: [{
        id: 3, status: 'OPEN', proposerId: FREELANCER, note: 'Need more time', deadline: null, declineNote: null, createdAt: '2030-01-02T00:00:00.000Z', decidedAt: null,
        changes: [{ op: 'add', title: 'Final files', dueDate: '2030-01-20T16:59:00.000Z', amount: 300 }],
      }],
    })
    const html = render(c, CLIENT)
    expect(html).toContain('Bob Maker asked for a change')
    expect(html).toContain('Add milestone 2: Final files · 300 credits')
    expect(html).toContain('Accept')
    expect(html).toContain('Decline')
    expect(html).not.toContain('Propose a change')
  })

  it('is read-only for an admin (shown as the client by the server)', () => {
    const c = contractOf([milestoneOf(1, 'SUBMITTED', { amount: 1250, submittedAt: '2030-01-05T00:00:00.000Z' })], { held: 1250 })
    const html = render(c, 99)
    expect(html).toContain('as an admin')
    for (const text of ['Approve and release', 'Request changes', 'Propose a change', 'Ask to end', 'End contract', 'Message']) expect(html).not.toContain(text)
  })
})

describe('FundError', () => {
  const html = (message: string) => renderToStaticMarkup(<FundError message={message} onLowerAmount={() => undefined} />)
  it('gives Top up and Ask to lower the amount for the too-few-credits sentence', () => {
    const out = html('You have 1,000 credits; this milestone needs 1,250. Top up or ask to lower the amount.')
    expect(out).toContain('You have 1,000 credits')
    expect(out).toContain('Top up')
    expect(out).toContain('href="/wallet"')
    expect(out).toContain('Ask to lower the amount')
  })
  it('shows other refusals alone', () => {
    const out = html('Milestone 1 is already funded.')
    expect(out).toContain('Milestone 1 is already funded.')
    expect(out).not.toContain('Top up')
    expect(out).not.toContain('Ask to lower the amount')
  })
})

describe('submitWorkErrors', () => {
  it('needs a note and only web links', () => {
    expect(submitWorkErrors({ note: ' ', images: [], links: [] })).toEqual(['Write a note about the work.'])
    expect(submitWorkErrors({ note: 'Done', images: [], links: ['', 'https://a.example'] })).toEqual([])
    expect(submitWorkErrors({ note: 'Done', images: [], links: ['javascript:alert(1)'] })).toEqual(['Links must start with http:// or https://.'])
    expect(submitWorkErrors({ note: 'Done', images: Array(11).fill('u'), links: [] })).toEqual(['Add up to 10 images.'])
  })
})
