'use client'

import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input, LiveStatus } from '@/shared/ui'
import { occupationKeys, occupationLabel, occupationQuery, occupationsApi, type OccupationHit } from './api'

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/** The title of an ESCO occupation code, loaded once; the code itself until it loads. */
export function useOccupationTitle(code: string) {
  const occupation = useQuery(occupationQuery(code))
  return occupation.data ? occupationLabel(occupation.data.title) : occupation.isError ? code : null
}

/**
 * Search box over the ESCO occupation catalogue. Titles, alternative labels and O*NET specialties all match, so
 * "front end developer" finds user interface developer. Nothing typed is kept unless a result is picked.
 */
export function OccupationPicker({
  value,
  onPick,
  onClear,
  label,
  hideLabel = false,
  placeholder = 'Search occupations, for example web developer',
  emptyLabel = 'Choose your occupation',
  previously,
  invalid = false,
  required = false,
  compact = false,
}: {
  /** The chosen ESCO code, or empty. */
  value: string
  onPick: (hit: OccupationHit) => void
  onClear?: () => void
  label: string
  hideLabel?: boolean
  placeholder?: string
  /** Shown while nothing is chosen. */
  emptyLabel?: string
  /** The old 37-field value of a resume saved before occupations, shown read-only as "previously: X". */
  previously?: string
  invalid?: boolean
  required?: boolean
  /** Small label, as inside a job row. */
  compact?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounced(query.trim(), 250)
  const listId = useId()
  const inputId = useId()
  const hintId = useId()
  const title = useOccupationTitle(value)
  const results = useQuery({
    queryKey: occupationKeys.search(search),
    queryFn: () => occupationsApi.search(search, 10),
    enabled: search.length > 0,
    staleTime: 300_000,
  })
  const hits = results.data ?? []
  const listShown = open && search.length > 0

  function choose(hit: OccupationHit) {
    onPick(hit)
    setQuery('')
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className={cn(compact ? 'text-xs font-semibold' : 'text-sm font-semibold', hideLabel && 'sr-only')}>
        {label}{required ? <> <span className="text-danger">*</span></> : null}
      </label>
      {value ? (
        <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
          <span id={hintId} className="min-w-0 truncate font-semibold"><span className="sr-only">Chosen: </span>{title ?? 'Loading…'}</span>
          {onClear ? (
            <button type="button" className="rounded p-0.5 text-muted hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
              aria-label={`Clear ${label.toLowerCase()}`} onClick={onClear}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : (
        <p id={hintId} className={cn('text-xs', invalid ? 'text-danger' : 'text-muted')}>
          {emptyLabel}
          {previously ? <span className="text-muted"> (previously: {previously})</span> : null}
        </p>
      )}
      <div className="relative">
        <Input
          id={inputId}
          role="combobox"
          aria-expanded={listShown && hits.length > 0}
          aria-controls={listShown ? listId : undefined}
          aria-describedby={hintId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder={value ? 'Search to change' : placeholder}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => Math.max(0, Math.min(i + 1, hits.length - 1))) }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
            else if (event.key === 'Enter' && open && hits[active]) { event.preventDefault(); choose(hits[active]) }
            else if (event.key === 'Escape') setOpen(false)
          }}
        />
        {listShown ? (
          <OccupationResults listId={listId} hits={hits} active={active} searching={results.isFetching}
            failed={results.isError} onActive={setActive} onChoose={choose} />
        ) : null}
      </div>
    </div>
  )
}

/** The result list: each occupation's title, and a small "matched: X" line when an alternative label or specialty matched. */
export function OccupationResults({
  listId,
  hits,
  active,
  searching = false,
  failed = false,
  onActive = () => {},
  onChoose,
}: {
  listId: string
  hits: OccupationHit[]
  active: number
  searching?: boolean
  failed?: boolean
  onActive?: (index: number) => void
  onChoose: (hit: OccupationHit) => void
}) {
  const status = searching && !hits.length ? 'Searching…'
    : failed ? 'Occupation search is unavailable. Try again.'
    : !hits.length ? 'No matching occupation. Try another job title.'
    : `${hits.length} ${hits.length === 1 ? 'occupation' : 'occupations'} found`
  return (
    <ul id={listId} role="listbox" aria-label="Occupations" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
      {/* Status rows are not options. The live region inside announces the status and the result count. */}
      <li role="presentation" className={cn('px-3 py-2 text-sm', hits.length ? 'sr-only' : failed ? 'text-danger' : 'text-muted')}>
        {hits.length ? null : <span aria-hidden="true">{status}</span>}
        <LiveStatus text={status} />
      </li>
      {hits.map((hit, index) => (
        <li key={hit.code} id={`${listId}-${index}`} role="option" aria-selected={index === active}
          className={cn('cursor-pointer px-3 py-2 text-sm', index === active && 'bg-primary/10')}
          onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => onActive(index)} onClick={() => onChoose(hit)}>
          <span className="block truncate">{occupationLabel(hit.title)}</span>
          {hit.matchedLabel ? <span className="block truncate text-xs text-muted">matched: {hit.matchedLabel}</span> : null}
        </li>
      ))}
    </ul>
  )
}
