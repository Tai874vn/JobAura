import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/shared/api/query-keys'
import { useOwnResume } from './use-own-resume'

function Probe({ enabled }: { enabled: boolean }) {
  const { resume } = useOwnResume(enabled, 1)
  return <span>{resume ? String((resume.data as { Name?: string }).Name) : 'none'}</span>
}

function render(enabled: boolean) {
  const client = new QueryClient()
  // The signed-in user's resume is already cached (they opened Settings or applied to a post earlier).
  client.setQueryData(queryKeys.myResume(1), { message: 'ok', content: { id: 1, userId: 1, data: { Name: 'Me' } } })
  return renderToStaticMarkup(<QueryClientProvider client={client}><Probe enabled={enabled} /></QueryClientProvider>)
}

describe('useOwnResume', () => {
  it('gives the cached resume on your own profile', () => {
    expect(render(true)).toContain('Me')
  })

  it("never shows your cached resume on someone else's profile", () => {
    expect(render(false)).toContain('none')
  })
})
