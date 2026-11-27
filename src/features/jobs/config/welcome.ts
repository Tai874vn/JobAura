/**
 * Configurable text and display counts for the public /welcome landing page.
 * Sets the hero search placeholder and how many categories appear in the browse grid.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/jobs/components/home/home-page.tsx
 */

// @find welcome page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /welcome (the public landing page)
 *
 * Safe edits: change a number or a text.
 */
export const welcomeConfig = {
  /** Grey hint text in the big search box (it searches /hiring-posts). */
  searchPlaceholder: 'Role, skill, or company',
  /** "Browse by category" grid: how many categories. */
  categoriesShown: 8,
} as const
