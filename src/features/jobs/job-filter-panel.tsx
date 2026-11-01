import type { FormEvent } from 'react'
import type { JobDetailType, JobSearchParams } from '@/shared/schemas'
import { Button, Card } from '@/shared/ui'

export function JobFilterPanel({ values, subcategories, loading, onApply, onClear }: {
  values: Pick<JobSearchParams, 'subcategoryId' | 'minPrice' | 'maxPrice' | 'minRating'>
  subcategories: JobDetailType[]
  loading: boolean
  onApply: (event: FormEvent<HTMLFormElement>) => void
  onClear: () => void
}) {
  return <Card id="job-filter-panel" className="mt-3 p-4 sm:p-5">
    <form onSubmit={onApply} aria-busy={loading}>
      <fieldset disabled={loading}>
        <legend className="sr-only">Service filters</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PanelField label="Specialty">
            <select name="subcategory" defaultValue={values.subcategoryId ?? ''} className="w-full min-w-0 bg-transparent text-sm outline-none" aria-label="Specialty">
              <option value="">All specialties</option>
              {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.tenChiTiet}</option>)}
            </select>
          </PanelField>
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Price range ($)</legend>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-primary">
              <input name="minPrice" type="number" min={0} step="0.01" defaultValue={values.minPrice ?? ''} placeholder="Min" aria-label="Minimum price" className="w-full min-w-0 bg-transparent text-sm outline-none" />
              <span aria-hidden="true" className="text-muted">–</span>
              <input name="maxPrice" type="number" min={0} step="0.01" defaultValue={values.maxPrice ?? ''} placeholder="Max" aria-label="Maximum price" className="w-full min-w-0 bg-transparent text-sm outline-none" />
            </div>
          </fieldset>
          <PanelField label="Minimum rating">
            <select name="minRating" defaultValue={values.minRating ?? ''} className="w-full min-w-0 bg-transparent text-sm outline-none" aria-label="Minimum rating">
              <option value="">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="4">4+ stars</option>
              <option value="5">5 stars</option>
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
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">{label}</span>
    <span className="flex h-10 items-center rounded-lg border border-border bg-surface px-3 transition focus-within:border-primary">{children}</span>
  </label>
}
