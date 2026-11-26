import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { occupationKeys, type Occupation } from '@/features/occupations/api'
import type { HiringPost } from '@/shared/schemas'
import { HiringPostFormDialog } from '../hiring-post-form-dialog'

// DialogPortal renders into document.body in the browser and returns null during SSR; inline children for static markup tests.
vi.mock('@/shared/ui/dialog-portal', () => ({
  DialogPortal: ({ children }: { children: ReactNode }) => children,
  useDialogFocus: () => () => undefined,
}))

const webDeveloper: Occupation = {
  code: '2513.5', isco: '2513', title: 'web developer', related: [],
  specialties: ['Back End Developer', 'Front End Developer', 'Full Stack Developer'],
}
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')

function markup(post: HiringPost | null) {
  const client = new QueryClient()
  client.setQueryData(occupationKeys.one(webDeveloper.code), webDeveloper)
  return renderToStaticMarkup(
    <QueryClientProvider client={client}><HiringPostFormDialog open post={post} onClose={() => undefined} /></QueryClientProvider>,
  )
}
const render = (post: HiringPost | null) => text(markup(post))

const base: Omit<HiringPost, 'id'> = {
  recruiterId: 2, title: 'Backend Engineer', description: 'Build and run the APIs.', yearsRequired: 3, skills: [],
  status: 'OPEN', applicationCount: 0, viewerHasApplied: false,
}

describe('HiringPostFormDialog', () => {
  it('opens a post saved before occupations with "previously" and asks for the occupation', () => {
    const html = render({ ...base, id: 1, occupationCode: null, legacyField: 'Software development' })
    expect(html).toContain('Choose the occupation (previously: Software development)')
    expect(html).toContain('Choose the occupation first')
  })

  it('asks how many people are hiring, 1 by default, with a keep-hiring checkbox', () => {
    const html = markup(null)
    expect(text(html)).toContain('How many people are you hiring?')
    expect(text(html)).toContain('Keep hiring until I close the post')
    expect(html).toMatch(/<input[^>]*max="50"[^>]*value="1"/)
  })

  it('opens a post with no limit with the box off and the checkbox on', () => {
    const html = markup({ ...base, id: 3, openings: null })
    expect(html).toMatch(/type="checkbox"[^>]*checked/)
    expect(html).toMatch(/type="number"[^>]*disabled/)
  })

  it('shows a saved post with its occupation and specialty', () => {
    const html = markup({ ...base, id: 2, occupationCode: '2513.5', specialty: 'Back End Developer' })
    expect(html).toMatch(/role="combobox"[^>]*value="Web developer"/)
    expect(html).toMatch(/role="combobox"[^>]*value="Back End Developer"/)
    expect(html).not.toContain('previously')
  })
})
