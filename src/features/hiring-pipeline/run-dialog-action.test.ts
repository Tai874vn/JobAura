import { describe, expect, it } from 'vitest'
import { runDialogAction } from './run-dialog-action'

describe('runDialogAction', () => {
  it('reports success for a plain call and for a resolved promise', async () => {
    expect(await runDialogAction(() => undefined, String)).toEqual({ ok: true })
    expect(await runDialogAction(() => Promise.resolve('x'), String)).toEqual({ ok: true })
  })

  it('returns the error sentence instead of throwing, so the dialog stays open', async () => {
    const result = await runDialogAction(() => Promise.reject(new Error('Too late')), (e) => (e as Error).message)
    expect(result).toEqual({ error: 'Too late' })
  })
})
