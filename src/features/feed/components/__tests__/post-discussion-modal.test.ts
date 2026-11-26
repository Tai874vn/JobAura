import { describe, expect, it } from 'vitest'
import { decideDiscussionScroll } from '../post-discussion-modal'

describe('decideDiscussionScroll', () => {
  it('scrolls to bottom on preview comments and again when the fetched first page arrives, then stops for earlier pages', () => {
    // 1. Modal opens with recentComments while page 1 is still loading.
    const preview = decideDiscussionScroll({
      open: true,
      commentCount: 2,
      hasLoadedFirstPage: false,
      stage: 'idle',
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(preview).toEqual({
      shouldScroll: true,
      behavior: 'auto',
      nextStage: 'preview',
      clearPendingOwnComment: false,
    })

    // 2. Re-render before page 1 arrives does not scroll again.
    const stillWaiting = decideDiscussionScroll({
      open: true,
      commentCount: 2,
      hasLoadedFirstPage: false,
      stage: preview.nextStage,
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(stillWaiting.shouldScroll).toBe(false)
    expect(stillWaiting.nextStage).toBe('preview')

    // 3. Fetched first page arrives and prepends older comments above recentComments.
    const firstPage = decideDiscussionScroll({
      open: true,
      commentCount: 5,
      hasLoadedFirstPage: true,
      stage: stillWaiting.nextStage,
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(firstPage).toEqual({
      shouldScroll: true,
      behavior: 'auto',
      nextStage: 'settled',
      clearPendingOwnComment: false,
    })

    // 4. User loads earlier comments ("View earlier comments"): must NOT jump to the bottom.
    const earlierPage = decideDiscussionScroll({
      open: true,
      commentCount: 10,
      hasLoadedFirstPage: true,
      stage: firstPage.nextStage,
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(earlierPage).toEqual({
      shouldScroll: false,
      behavior: 'auto',
      nextStage: 'settled',
      clearPendingOwnComment: false,
    })
  })

  it('settles on first page even when no recentComments were rendered beforehand', () => {
    const emptyInitial = decideDiscussionScroll({
      open: true,
      commentCount: 0,
      hasLoadedFirstPage: false,
      stage: 'idle',
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(emptyInitial.shouldScroll).toBe(false)
    expect(emptyInitial.nextStage).toBe('idle')

    const firstPage = decideDiscussionScroll({
      open: true,
      commentCount: 5,
      hasLoadedFirstPage: true,
      stage: emptyInitial.nextStage,
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(firstPage).toEqual({
      shouldScroll: true,
      behavior: 'auto',
      nextStage: 'settled',
      clearPendingOwnComment: false,
    })
  })

  it('scrolls on own submitted comment and respects reduced motion', () => {
    const smooth = decideDiscussionScroll({
      open: true,
      commentCount: 6,
      hasLoadedFirstPage: true,
      stage: 'settled',
      pendingOwnComment: true,
      prefersReducedMotion: false,
    })
    expect(smooth).toEqual({
      shouldScroll: true,
      behavior: 'smooth',
      nextStage: 'settled',
      clearPendingOwnComment: true,
    })

    const reduced = decideDiscussionScroll({
      open: true,
      commentCount: 6,
      hasLoadedFirstPage: true,
      stage: 'settled',
      pendingOwnComment: true,
      prefersReducedMotion: true,
    })
    expect(reduced.behavior).toBe('auto')
    expect(reduced.shouldScroll).toBe(true)
    expect(reduced.clearPendingOwnComment).toBe(true)
  })

  it('resets stage to idle when the modal closes', () => {
    const closed = decideDiscussionScroll({
      open: false,
      commentCount: 5,
      hasLoadedFirstPage: true,
      stage: 'settled',
      pendingOwnComment: false,
      prefersReducedMotion: false,
    })
    expect(closed).toEqual({
      shouldScroll: false,
      behavior: 'auto',
      nextStage: 'idle',
      clearPendingOwnComment: false,
    })
  })
})
