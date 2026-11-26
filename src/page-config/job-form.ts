// @find job-form page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /jobs/new and /jobs/[id]/edit (the form that creates or edits a service / portfolio post)
 *
 * Safe edits: LOWER a number. These limits repeat the backend rules (CreateJobDto); a higher number
 * only moves the error from the form to the server.
 */
export const jobFormConfig = {
  /** Longest title, in characters. */
  titleMax: 160,
  /** Longest short description (shown on the card). */
  shortDescriptionMax: 500,
  /** Longest full description. */
  descriptionMax: 5000,
  /** Longest "service area" text. */
  serviceAreaMax: 160,

  /** The milestone template a client starts a proposal from. */
  milestoneTemplate: {
    /** Most rows. */
    maxRows: 10,
    /** Longest milestone title. */
    titleMax: 80,
    /** Longest milestone description. */
    descriptionMax: 300,
  },
} as const
