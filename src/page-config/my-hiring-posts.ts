// @find my-hiring-posts page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /my-hiring-posts (a recruiter's own posts) and the hiring post form (create / edit dialog)
 *
 * Safe edits: remove a line, reorder lines, change a label or a number.
 */
export const myHiringPostsConfig = {
  /** Posts per page. */
  pageSize: 10,
  /** How many posts are loaded at once to count and sort them here. Backend limit: at most 100. */
  loadLimit: 100,

  /** The "Sort" menu ('' = newest first). Only rename or remove; these two are the only sorts this page knows. */
  sortLabels: { '': 'Newest', applicants: 'Most applicants' },

  /** Choices in the hiring post form. */
  postForm: {
    /** "Employment type" dropdown. Free text in the database, so a new type also works. */
    employmentTypes: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
    /** "Level" choices. Must be Junior, Mid or Senior (backend HIRING_POST_LEVELS). */
    levels: ['Junior', 'Mid', 'Senior'],
  },
} as const
