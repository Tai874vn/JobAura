// @find profile page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /profile/[id] (a member's public profile)
 *
 * Safe edits: change a number.
 */
export const profileConfig = {
  /** Skills shown in the profile header, under the name. */
  skillsInHeader: 4,
  /** Skills shown in the "Skills" section. */
  skillsInSection: 10,
} as const
