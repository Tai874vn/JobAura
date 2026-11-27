/**
 * PAGE CONFIG: /profile/[id] (a member's public profile). Sets how many skills appear in the profile header and in the skills section; safe edits: change a number.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/users/components/profile/profile-content.tsx
 *   - features/users/components/profile/profile-page.tsx
 */

// @find profile page config logic [all] — every adjustable value of this page
export const profileConfig = {
  /** Skills shown in the profile header, under the name. */
  skillsInHeader: 4,
  /** Skills shown in the "Skills" section. */
  skillsInSection: 10,
} as const
