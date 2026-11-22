import type { FormEvent } from 'react'
import type { Subcategory, JobSearchParams } from '@/shared/schemas'
import { Button, Card } from '@/shared/ui'

export function JobFilterPanel({ values, subcategories, loading, onApply, onClear }: {
  values: Pick<JobSearchParams, 'subcategoryId' | 'minPrice' | 'maxPrice' | 'minRating'>
  subcategories: Subcategory[]
  loading: boolean
  onApply: (event: FormEvent<HTMLFormElement>) => void
  onClear: () => void
}) {
  return <Card id="job-filter-panel" className="mt-3 p-4 sm:p-5">
    <form onSubmit={onApply} aria-busy={loading}>
      <fieldset disabled={loading}>
        <legend className="sr-only">Portfolio filters</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <PanelField label="Specialty">
            <select name="subcategory" defaultValue={values.subcategoryId ?? ''} className="w-full min-w-0 bg-transparent text-sm outline-none" aria-label="Specialty">
              <option value="">All specialties</option>
              {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
            </select>
          </PanelField>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>Clear all</Button>
          <Button type="submit" loading={loading}>{loading ? 'Applying filters' : 'Apply filters'}</Button>
        </div>
      </fieldset>
    </form>
  </Card>
}

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
    <span className="flex h-10 items-center field-shell rounded-lg border border-border bg-surface px-3">{children}</span>
  </label>
}
