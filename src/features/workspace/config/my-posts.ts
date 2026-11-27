/**
 * Editable config values for the /my-posts page.
 * Sets how many of the signed-in user's portfolio and service posts are loaded at once.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/workspace/components/my-posts-page.tsx
 */

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
