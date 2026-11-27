/**
 * Small async wrapper used by confirmation and form dialogs across the hiring pipeline and contracts features.
 * Runs a callback without throwing and returns either an ok flag or an error message so the dialog can stay open on failure.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/contracts/components/proposal/proposal-panel.tsx
 *   - features/contracts/hooks/use-contract-actions.ts
 *   - features/hiring-pipeline/components/applicants/applicant-panel.tsx
 *   - features/hiring-pipeline/components/interview-card.tsx
 *   - features/hiring-pipeline/components/my-applications/my-application-panel.tsx
 */

/**
 * Runs what a dialog confirms. It never throws: on success the dialog may close; on failure the dialog stays
 * open (the typed values are kept) and shows the returned sentence.
 */
export async function runDialogAction(
  call: () => void | Promise<unknown>,
  toMessage: (error: unknown) => string,
): Promise<{ ok: true } | { error: string }> {
  try {
    await call()
    return { ok: true }
  } catch (error) {
    return { error: toMessage(error) }
  }
}
