// @find my-applications page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /my-applications (a candidate's own applications)
 *
 * Safe edits: change a label or a number.
 */
export const myApplicationsConfig = {
  /** Applications per page. */
  pageSize: 20,

  /**
   * The 5 steps of the progress tracker. Only RENAME them: each position is one stage of the hiring
   * pipeline (applied, shortlisted, interview, offer, hired), so removing or adding a step breaks the tracker.
   */
  trackerLabels: ['Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired'],
} as const
