import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { closedTip, InfoTipView, tipReducer, type TipEvent, type TipState } from './info-tip'

// The repo has no DOM test environment (no jsdom or happy-dom), so the interaction runs the events a browser fires,
// in its order, through the same reducer InfoTip uses, and renders the result after each step.
function interact(...events: TipEvent[]) {
  let state: TipState = closedTip
  for (const event of events) state = tipReducer(state, event)
  return state
}

const shown = (state: TipState) => renderToStaticMarkup(
  <InfoTipView text="28% of ESCO skill groups shared × 0.3" label="How +0.2 yr is counted" open={state.open} send={() => undefined} />,
)
const visible = (html: string) => /role="tooltip"[^>]*>28% of ESCO skill groups shared × 0.3</.test(html)

// A mouse click fires mouseenter, then focus, then click; a tap fires focus, then click.
const mouseClick: TipEvent[] = ['hoverIn', 'focus', 'click']
const tap: TipEvent[] = ['focus', 'click']

describe('InfoTip', () => {
  it('stays open after a click, and Escape hides it', () => {
    const clicked = interact(...mouseClick)
    expect(visible(shown(clicked))).toBe(true)
    expect(shown(clicked)).toContain('aria-expanded="true"')
    expect(visible(shown(tipReducer(clicked, 'escape')))).toBe(false)
  })

  it('stays open after a tap, and pressing outside hides it', () => {
    const tapped = interact(...tap)
    expect(visible(shown(tapped))).toBe(true)
    expect(visible(shown(tipReducer(tapped, 'outside')))).toBe(false)
  })

  it('does not close when the pointer leaves after a click, or on a second click', () => {
    expect(visible(shown(interact(...mouseClick, 'hoverOut')))).toBe(true)
    expect(visible(shown(interact(...mouseClick, 'click')))).toBe(true)
  })

  it('opens on hover and closes when the pointer leaves', () => {
    expect(visible(shown(interact('hoverIn')))).toBe(true)
    expect(visible(shown(interact('hoverIn', 'hoverOut')))).toBe(false)
  })

  it('opens on keyboard focus; Enter or Space (a click) keeps it open; Escape or leaving hides it', () => {
    expect(visible(shown(interact('focus')))).toBe(true)
    expect(visible(shown(interact('focus', 'click')))).toBe(true)
    expect(visible(shown(interact('focus', 'click', 'escape')))).toBe(false)
    expect(visible(shown(interact('focus', 'blur')))).toBe(false)
  })

  it('starts closed with the text still on the button title', () => {
    const html = shown(closedTip)
    expect(visible(html)).toBe(false)
    expect(html).toContain('title="28% of ESCO skill groups shared × 0.3"')
  })
})
