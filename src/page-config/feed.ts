// @find feed page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: / (home feed of a signed-in user)
 *
 * Safe edits: change a number or a text.
 */
export const feedConfig = {
  /** Posts loaded each time the feed reaches the bottom. Backend limit: at most 50. */
  postsPerLoad: 10,
  /** Grey hint text in the "new post" box. */
  composerPlaceholder: 'What do you want to share?',

  rightRail: {
    /** "Trending skills" card: how many skills. */
    trendingSkills: 6,
    /** "People you may know" card: how many people. */
    peopleYouMayKnow: 2,
  },

  /** "Jobs for you" card: how many hiring posts. */
  jobsForYou: 3,
} as const
