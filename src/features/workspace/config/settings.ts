/**
 * Editable option lists for the /settings page.
 * Defines the highest-degree choices for the resume form.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/users/utils/resume-career.ts
 */

// @find settings page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /settings (profile and resume settings)
 *
 * Safe edits: rename, reorder. Removing a value hides it from the form; profiles that already saved it keep it.
 */
export const settingsConfig = {
  /**
   * "Highest degree" choices on the resume. These exact words are also read by the AI seniority model,
   * so rename only together with the AI service.
   */
  degreeLevels: ['Not stated', 'Below bachelor', 'Bachelor', 'Master or higher'],
} as const
