import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BrowseHero, BrowsePage, FilterChoice, FilterGroup, FilterPanel, FiltersToggle, ResultsHeader } from '../browse-page'

const page = (change: { filtersOpen?: boolean; pagination?: boolean; noExplore?: boolean } = {}) => renderToStaticMarkup(
  <BrowsePage
    resultsKey="" resultsReady
    hero={<BrowseHero title="Find a role" intro="Open roles." action={<a href="/mine">Mine</a>} />}
    search={<form role="search" aria-label="Search" />}
    explore={change.noExplore ? undefined : <span>Explore row</span>}
    filtersOpen={change.filtersOpen ?? false}
    filters={
      <FilterPanel intro="Narrow it down." onReset={() => undefined} canReset={false}>
        <FilterGroup title="Level" last>
          <FilterChoice label="Senior" checked count={3} onChange={() => undefined} />
          <FilterChoice label="Junior" checked={false} onChange={() => undefined} />
        </FilterGroup>
      </FilterPanel>
    }
    toolbar={<ResultsHeader title="12 open roles" actions={<FiltersToggle open={false} onToggle={() => undefined} count={2} />} summary="Showing 1–10 of 12" />}
    results={<ul aria-label="Results"><li>One</li></ul>}
    pagination={change.pagination ? <nav aria-label="Pages" /> : undefined}
  />,
)

describe('BrowsePage', () => {
  it('lays out the hero, a sticky search band, the filter column and the results in order', () => {
    const html = page()
    expect(html).toContain('<h1')
    expect(html).toContain('href="/mine"')
    expect(html).toMatch(/class="sticky top-16 z-20 bg-surface-muted"><div class="container-page py-3 lg:pt-5"><form role="search"/)
    expect(html).toContain('lg:grid-cols-[256px_minmax(0,1fr)]')
    const order = ['<h1', 'role="search"', 'Explore row', 'aria-label="Filters"', '12 open roles', 'aria-label="Results"']
    const at = order.map((part) => html.indexOf(part))
    expect(at.every((index) => index >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('hides the filter column on phones until it is opened', () => {
    expect(page()).toMatch(/<aside class="lg:block hidden" aria-label="Filters">/)
    expect(page({ filtersOpen: true })).toMatch(/<aside class="lg:block max-lg:motion-popover block" aria-label="Filters">/)
  })

  it('shows filter counts, the ticked choice, a disabled Reset and the number of filters on', () => {
    const html = page()
    expect(html).toContain('>3</span>')
    expect(html).toContain('checked=""')
    expect(html).toMatch(/<button type="button" disabled="">Reset<\/button>|disabled="" class="[^"]*">Reset/)
    expect(html).toContain('Filters (2)')
    expect(html).toContain('Showing 1–10 of 12')
  })

  it('adds the pagination block only when pagination is given', () => {
    expect(page()).not.toContain('mt-6 grid gap-3')
    expect(page({ pagination: true })).toContain('<div class="mt-6 grid gap-3"><nav aria-label="Pages"></nav></div>')
  })

  it('draws no empty strip when there is no Explore row; the search band takes the bottom border', () => {
    const html = page({ noExplore: true })
    expect(html).not.toContain('pb-4 lg:pb-6')
    expect(html).toContain('class="sticky top-16 z-20 bg-surface-muted border-b border-border"><div class="container-page py-3 lg:py-5"><form')
    expect(page()).toContain('pb-4 lg:pb-6')
  })
})
