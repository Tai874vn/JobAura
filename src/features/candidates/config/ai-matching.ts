/**
 * Config constants for the Recommended candidates (/recommendations/candidates) AI matching page.
 * Defines the selectable result count (topKOptions) and candidate pool size (poolSizeOptions) choices.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/candidates/utils/recommended-candidates/constants.ts
 */

// @find ai-matching page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /recommendations/candidates ("AI matching": ranked candidates for one hiring post)
 *
 * Safe edits: remove a number, reorder, change a number.
 */
export const aiMatchingConfig = {
  /** "Show top" choices: how many ranked candidates come back. Backend limit: at most 100. */
  topKOptions: [5, 10, 12],
  /** "Compare against" choices: how many candidates the AI looks at before ranking. */
  poolSizeOptions: [50, 100, 150],
} as const
