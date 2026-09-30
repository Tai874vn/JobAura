import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Job, UserProfile } from '@/shared/schemas'
import { ProfilePostCard } from './profile-content'

describe('ProfilePostCard', () => {
  it('labels an unrated service as new', () => {
    const post = {
      id: 1,
      tenCongViec: 'Build a portfolio',
      giaTien: 100,
      danhGia: 0,
      saoCongViec: 0,
    } as Job
    const user = { id: 2, name: 'Ava', email: 'ava@example.com' } as UserProfile

    const html = renderToStaticMarkup(<ProfilePostCard post={post} user={user} />)

    expect(html).toContain('New · no reviews yet')
    expect(html).not.toContain('0.0')
  })
})
