import type { ApplicationStatus } from '@/shared/schemas'

// @find applicants page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /my-hiring-posts/[id]/applicants (a recruiter's applicants board for one post)
 *
 * Safe edits: remove a line, reorder lines, change a label or a number.
 */
export const applicantsConfig = {
  /** Applicants per page. */
  pageSize: 20,

  /**
   * The status tabs above the list, in this order. Remove a line to hide that tab; change `label` to rename it.
   * `key` must be 'all' or a real application status (APPLIED, REVIEWING, INTERVIEWING, OFFERED, HIRED,
   * REJECTED, DECLINED, WITHDRAWN).
   */
  tabs: [
    { key: 'all', label: 'All' },
    { key: 'APPLIED', label: 'New' },
    { key: 'REVIEWING', label: 'Shortlisted' },
    { key: 'INTERVIEWING', label: 'Interview' },
    { key: 'OFFERED', label: 'Offer' },
    { key: 'HIRED', label: 'Hired' },
    { key: 'REJECTED', label: 'Not selected' },
  ] satisfies { key: 'all' | ApplicationStatus; label: string }[],

  /** "Request interview" dialog: the length choices, in minutes. */
  interviewDurations: [15, 30, 45, 60, 90, 120],
} as const
