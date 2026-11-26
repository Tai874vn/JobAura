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
