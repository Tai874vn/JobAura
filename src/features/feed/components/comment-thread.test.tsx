import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PostComment } from '@/shared/schemas'
import { CommentThread } from './comment-thread'

const comment: PostComment = {
  id: 4, postId: 10, authorId: 6, content: 'Root comment', parentId: null, replyCount: 2,
  createdAt: '2026-10-12T00:00:00Z', author: { id: 6, name: 'User', avatar: null, headline: null },
}

function render(currentUserId: number, currentUserRole = 'user') {
  const client = new QueryClient()
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <CommentThread
        comment={comment} currentUserId={currentUserId} currentUserRole={currentUserRole}
        onReply={async () => undefined} onEdit={async () => undefined} onDelete={async () => undefined}
      />
    </QueryClientProvider>,
  )
  client.clear()
  return html
}

describe('comment thread controls', () => {
  it('offers collapsed replies without rendering reply composers for every root', () => {
    const html = render(9)
    expect(html).toContain('Root comment')
    expect(html).toContain('View 2 replies')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Reply')
    expect(html).not.toContain('textarea')
    expect(html).not.toContain('aria-label="Edit comment"')
    expect(html).not.toContain('aria-label="Delete comment"')
  })

  it('offers editing only to the author and deletion to author or admin', () => {
    expect(render(6)).toContain('aria-label="Edit comment"')
    expect(render(6)).toContain('aria-label="Delete comment"')
    const admin = render(9, 'admin')
    expect(admin).not.toContain('aria-label="Edit comment"')
    expect(admin).toContain('aria-label="Delete comment"')
  })
})
