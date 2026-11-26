// @find my-posts page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /my-posts (my portfolio / service posts)
 *
 * Safe edits: change the number.
 */
export const myPostsConfig = {
  /** How many of my posts are loaded. Backend limit: at most 100. */
  loadSize: 50,
} as const
