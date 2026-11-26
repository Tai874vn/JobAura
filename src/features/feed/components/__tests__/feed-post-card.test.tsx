import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { FeedPost } from '@/shared/schemas'
import { FeedPostCard } from '../feed-post-card'

const post: FeedPost = {
  id: 1,
  content: 'A new portfolio project',
  imageUrl: null,
  createdAt: '2026-10-04T00:00:00Z',
  updatedAt: '2026-10-04T00:00:00Z',
  author: { id: 2, name: 'Ava', avatar: null, headline: null },
  likeCount: 1,
  commentCount: 0,
  viewerHasLiked: true,
  viewerHasSaved: true,
  recentComments: [],
}

describe('Feed action feedback', () => {
  it('exposes selected and pending states without removing the controls', () => {
    const html = renderToStaticMarkup(
      <FeedPostCard
        post={post}
        currentUserId={3}
        index={0}
        liking
        saving
        onLike={() => undefined}
        onSave={() => undefined}
        onDelete={() => undefined}
        onOpenComments={() => undefined}
      />
    )

    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2)
    expect(html.match(/aria-busy="true"/g)).toHaveLength(2)
    expect(html).toContain('Liked')
    expect(html).toContain('aria-label="Remove saved post"')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
  })
})
