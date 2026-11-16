import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { occupationKeys, type Occupation } from '@/features/occupations/api'
import type { HiringPost } from '@/shared/schemas'
import { HiringPostBadges } from './hiring-post-card'
import { postOccupation } from './hiring-post-form'

const webDeveloper: Occupation = { code: '2513.5', isco: '2513', title: 'web developer', related: [], specialties: [] }
const post = (change: Partial<HiringPost>): HiringPost => ({
  id: 1, recruiterId: 2, title: 'Engineer', description: 'Build the product.', skills: [], status: 'OPEN',
  applicationCount: 0, viewerHasApplied: false, ...change,
})
function badges(value: HiringPost) {
  const client = new QueryClient()
  client.setQueryData(occupationKeys.one(webDeveloper.code), webDeveloper)
  return renderToStaticMarkup(<QueryClientProvider client={client}><HiringPostBadges post={value} /></QueryClientProvider>)
}

describe('post occupation on recommended-job cards', () => {
  it('uses the catalogue title loaded for the code when the response has no title', () => {
    expect(postOccupation({ occupationCode: '2513.5', occupationTitle: null, legacyField: null }, 'Web developer'))
      .toEqual({ label: 'Web developer', legacy: false })
    expect(postOccupation({ occupationCode: '2513.5', occupationTitle: null, legacyField: null }, null)).toBeNull()
  })

  it('a recommended post with only occupationCode (saved before titles) shows the occupation', () => {
    expect(badges(post({ occupationCode: '2513.5', occupationTitle: null }))).toContain('Web developer')
  })

  it('a legacy post shows "Previously: X"', () => {
    expect(badges(post({ occupationCode: null, legacyField: 'Software development' }))).toContain('Previously: Software development')
  })
})
