/**
 * PAGE CONFIG: /contracts (proposals and contracts of the signed-in user), holding list page size, tab labels, and form limits matching backend rules.
 * Safe edits: change a label or lower a number; raising a limit above the backend rule only moves the error to the server.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/contracts/components/contracts-page.tsx
 *   - features/contracts/components/dialogs/amendment-dialog.tsx
 *   - features/contracts/components/dialogs/submit-work-dialog.tsx
 *   - features/contracts/components/proposal/new-proposal-dialog.tsx
 *   - features/contracts/utils/contracts-selection.ts
 *   - features/contracts/utils/proposal-editor-model.ts
 */

// @find contracts page config logic [all] — every adjustable value of this page
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
