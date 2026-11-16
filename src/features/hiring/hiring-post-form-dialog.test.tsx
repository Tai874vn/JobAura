import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { occupationKeys, type Occupation } from '@/features/occupations/api'
import type { HiringPost } from '@/shared/schemas'
import { HiringPostFormDialog } from './hiring-post-form-dialog'

const webDeveloper: Occupation = {
  code: '2513.5', isco: '2513', title: 'web developer', related: [],
  specialties: ['Back End Developer', 'Front End Developer', 'Full Stack Developer'],
}
const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')

function render(post: HiringPost | null) {
  const client = new QueryClient()
  client.setQueryData(occupationKeys.one(webDeveloper.code), webDeveloper)
  return text(renderToStaticMarkup(
    <QueryClientProvider client={client}><HiringPostFormDialog open post={post} onClose={() => undefined} /></QueryClientProvider>,
  ))
}

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

  it('shows a saved post with its occupation and specialty', () => {
    const html = render({ ...base, id: 2, occupationCode: '2513.5', specialty: 'Back End Developer' })
    expect(html).toContain('Chosen: Web developer')
    expect(html).toContain('Chosen: Back End Developer')
    expect(html).not.toContain('previously')
  })
})
