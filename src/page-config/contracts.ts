// @find contracts page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /contracts (proposals and contracts of the signed-in user)
 *
 * Safe edits: change a label or LOWER a number. The limits below repeat the backend rules: the frontend
 * stops the user early with a clear message; raising one above the backend limit only moves the error to the server.
 */
export const contractsConfig = {
  /** Proposals and contracts loaded in the list. */
  pageSize: 50,

  /** The two tabs. Only rename: each key is one side of a contract. */
  tabs: [
    { key: 'client', label: 'As client' },
    { key: 'freelancer', label: 'As freelancer' },
  ],

  proposal: {
    /** Most milestones in one proposal (backend: 20). */
    maxMilestones: 20,
    /** Highest amount of one milestone, in credits (backend: 1,000,000). */
    maxAmount: 1_000_000,
    /** Most reference links in one proposal (backend: 10). */
    maxReferences: 10,
    /** A new proposal's first due date: this many days from today. */
    defaultDeadlineDays: 14,
  },

  /** "Request changes" dialog: most changes in one request (backend: 10). */
  maxChangesPerRequest: 10,

  submitWork: {
    /** Most files in one delivery (backend: 10). */
    maxFiles: 10,
    /** Longest delivery note, in characters (backend: 2000). */
    maxNoteLength: 2000,
  },
} as const
