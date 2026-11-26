'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { Input, LiveStatus } from '@/shared/ui'
import { occupationKeys, occupationLabel, occupationQuery, occupationsApi, type OccupationHit } from '../api'

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
 * "front end developer" finds user interface developer. One box: it shows the chosen title, and typing in it searches;
 * nothing typed is kept unless a result is picked (Escape or leaving the box shows the chosen title again).
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
  // True once the user types; until then the box shows the chosen occupation's title.
  const [typing, setTyping] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounced(typing ? query.trim() : '', 250)
  const listId = useId()
  const inputId = useId()
  const hintId = useId()
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const title = useOccupationTitle(value)
  const results = useQuery({
    queryKey: occupationKeys.search(search),
    queryFn: () => occupationsApi.search(search, 10),
    enabled: search.length > 0,
    // Keep the previous hits visible while the next debounced search loads so the dropdown does not collapse.
    placeholderData: keepPreviousData,
    staleTime: 300_000,
  })
  const hits = results.data ?? []
  const listShown = open && search.length > 0

  function clearBlurTimer() {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
  }

  useEffect(() => clearBlurTimer, [])

  function choose(hit: OccupationHit) {
    onPick(hit)
    reset()
  }

  /** Back to showing the chosen title, with the list closed. */
  function reset() {
    clearBlurTimer()
    setQuery('')
    setTyping(false)
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="grid content-start gap-1">
      <label htmlFor={inputId} className={cn(compact ? 'text-xs font-medium' : 'text-sm font-medium', hideLabel && 'sr-only')}>
        {label}{required ? <> <span className="text-danger">*</span></> : null}
      </label>
      {value ? null : (
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
          aria-describedby={value ? undefined : hintId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          aria-activedescendant={open && hits[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          className={cn(value && onClear && 'pr-9', value && !typing && 'font-medium')}
          value={typing ? query : value ? title ?? '' : ''}
          placeholder={value && !title ? 'Loading…' : placeholder}
          onChange={(event) => { setQuery(event.target.value); setTyping(true); setOpen(true); setActive(0) }}
          onFocus={(event) => { clearBlurTimer(); event.target.select(); if (typing) setOpen(true) }}
          // While it shows the chosen value, a click selects it all, so typing replaces it.
          onClick={(event) => { if (!typing) event.currentTarget.select() }}
          onBlur={() => { clearBlurTimer(); blurTimerRef.current = setTimeout(reset, 120) }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => Math.max(0, Math.min(i + 1, hits.length - 1))) }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
            else if (event.key === 'Enter' && open && hits[active]) { event.preventDefault(); choose(hits[active]) }
            else if (event.key === 'Escape') { if (open || typing) event.preventDefault(); reset() }
          }}
        />
        {value && onClear ? (
          <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
            aria-label={`Clear ${label.toLowerCase()}`} onMouseDown={(event) => event.preventDefault()} onClick={() => { reset(); onClear() }}>
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {listShown ? (
          <OccupationResults listId={listId} hits={hits} active={active} searching={results.isFetching}
            failed={results.isError}
            errorMessage={results.isError ? getErrorMessage(results.error, 'Occupation search is unavailable. Try again.') : undefined}
            onActive={setActive} onChoose={choose} />
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
  errorMessage,
  onActive = () => {},
  onChoose,
}: {
  listId: string
  hits: OccupationHit[]
  active: number
  searching?: boolean
  failed?: boolean
  errorMessage?: string
  onActive?: (index: number) => void
  onChoose: (hit: OccupationHit) => void
}) {
  const status = searching && !hits.length ? 'Searching…'
    : failed ? (errorMessage ?? 'Occupation search is unavailable. Try again.')
    : !hits.length ? 'No matching occupation. Try another job title.'
    : `${hits.length} ${hits.length === 1 ? 'occupation' : 'occupations'} found`
  return (
    <ul id={listId} role="listbox" aria-label="Occupations" className="menu-drop absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
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
