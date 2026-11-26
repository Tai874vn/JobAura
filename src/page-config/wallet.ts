// @find wallet page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /wallet (credit balance, history, top-up)
 *
 * Safe edits: remove a number, reorder, change a number.
 */
export const walletConfig = {
  /** History rows loaded each time "Load more" is pressed. */
  ledgerPageSize: 20,
  /**
   * Quick choices in the "Top up" dialog, in credits. Each must be within the top-up limits the server
   * sends (10 to 10,000 credits); choices outside them are hidden.
   */
  topUpQuickPicks: [100, 500, 1000, 2500],
} as const
