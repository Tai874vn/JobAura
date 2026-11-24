import { describe, expect, it, vi } from 'vitest'

const redirect = vi.hoisted(() => vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) }))
vi.mock('next/navigation', () => ({ redirect }))

describe('/my-jobs page', () => {
  it('sends everyone to the contracts page', async () => {
    const { default: Page } = await import('./page')
    expect(() => Page()).toThrow('REDIRECT:/contracts')
    expect(redirect).toHaveBeenCalledWith('/contracts')
  })
})
