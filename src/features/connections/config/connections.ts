// @find connections page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /connections (my connections and people to discover)
 *
 * Safe edits: change a number or a text.
 */
export const connectionsConfig = {
  /** People per page, in both tabs. Backend limit: 1–100. */
  pageSize: 24,
  /** Grey hint text in the search box. */
  searchPlaceholder: 'Search people, skills, or location',
  /** Skills shown on each person's card. */
  skillsPerCard: 3,
} as const
