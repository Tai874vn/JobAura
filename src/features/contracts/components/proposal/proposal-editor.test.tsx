import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProposalEditor } from './proposal-editor'
import type { EditorState } from '../../utils/proposal-editor-model'

const state = (): EditorState => ({
  brief: '',
  referenceLinks: [],
  referenceImages: [],
  deadline: '2099-12-31',
  rows: [
    { key: 'a', title: 'Plan', description: '', dueDate: '2099-12-01', amount: '1250' },
    { key: 'b', title: 'Build', description: '', dueDate: '2099-12-20', amount: '' },
  ],
})

describe('ProposalEditor', () => {
  it('shows the live total, ignoring the empty row', () => {
    const html = renderToStaticMarkup(<ProposalEditor initial={state()} mode="new" onSubmit={() => undefined} />)
    expect(html).toContain('Total: 1,250 credits')
  })

  it('names the row error and disables Send while an error is left', () => {
    const html = renderToStaticMarkup(<ProposalEditor initial={state()} mode="new" onSubmit={() => undefined} />)
    expect(html).toContain('Each milestone is at least 1 credit.')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>[^<]*Send proposal/)
  })

  it('uses the counter-offer wording', () => {
    const html = renderToStaticMarkup(<ProposalEditor initial={state()} mode="counter" onSubmit={() => undefined} />)
    expect(html).toContain('Send counter-offer')
  })

  it('in an amendment, hides the brief and makes funded and closed rows read-only', () => {
    const html = renderToStaticMarkup(
      <ProposalEditor initial={state()} mode="amendment" lockedRows={{ a: 'APPROVED', b: 'FUNDED' }} onSubmit={() => undefined} />,
    )
    expect(html).not.toContain('pe-brief')
    expect(html).toContain('This milestone can no longer change.')
    expect(html).toContain('Already funded: only the due date can change.')
    expect(html).not.toContain('Remove milestone')
  })
})
