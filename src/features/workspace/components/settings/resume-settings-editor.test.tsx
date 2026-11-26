import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { ResumeSettingsEditor } from './resume-settings-editor'

function render(client: QueryClient) {
  return renderToStaticMarkup(<QueryClientProvider client={client}><ResumeSettingsEditor active={false} /></QueryClientProvider>)
}

describe('Resume settings recovery', () => {
  it('does not offer an empty editable resume while initial data is unresolved', () => {
    const client = new QueryClient()
    const html = render(client)
    expect(html).toContain('Loading settings')
    expect(html).not.toContain('Save resume')
    expect(html).not.toContain('textarea')
    client.clear()
  })

  it('offers retry instead of a blank form when initial data fails', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.getQueryCache().build(client, { queryKey: queryKeys.myResume() }).setState({ status: 'error', error: new Error('Offline') })
    const html = render(client)
    expect(html).toContain('Resume could not be loaded')
    expect(html).toContain('Retry')
    expect(html).not.toContain('textarea')
    client.clear()
  })

  it('allows creating a resume after the server confirms it is absent', () => {
    const client = new QueryClient()
    client.setQueryData(queryKeys.myResume(), { content: null })
    const html = render(client)
    expect(html).toContain('Career fields')
    expect(html).toContain('Save resume')
    client.clear()
  })
})
