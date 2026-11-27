/**
 * PAGE CONFIG: /connections (my connections and people to discover), holding page size, search hint text, and skills shown per card.
 * Safe edits: change a number or text.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/connections/components/connections-page.tsx
 */

// @find connections page config logic [all] — every adjustable value of this page
export const connectionsConfig = {
  /** People per page, in both tabs. Backend limit: 1–100. */
  pageSize: 24,
  /** Grey hint text in the search box. */
  searchPlaceholder: 'Search people, skills, or location',
  /** Skills shown on each person's card. */
  skillsPerCard: 3,
} as const
