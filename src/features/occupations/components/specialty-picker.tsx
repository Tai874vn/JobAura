'use client'

/**
 * Optional specialty picker for the occupations feature. Filters and lets users pick from the O*NET specialties listed under the selected ESCO occupation.
 *
 * Calls: GET /api/occupations/:code; occupationQuery; getErrorMessage; LiveStatus
 * Used by:
 *   - features/hiring/components/form/hiring-post-form-dialog.tsx
 *   - features/users/components/resume/resume-career-fields.tsx
 */

import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { Input, LiveStatus } from '@/shared/ui'
import { occupationQuery } from '../api'

const SHOWN = 30

/** The occupation's specialties that contain every word typed, case and spacing ignored; the first SHOWN of them. */
export function filterSpecialties(specialties: string[], query: string) {
  const words = query.toLowerCase().split(/[\s-]+/).filter(Boolean)
  const squash = (text: string) => text.toLowerCase().replace(/[\s-]+/g, '')
  return specialties.filter((name) => words.every((word) => squash(name).includes(word))).slice(0, SHOWN)
}

/**
 * Optional specialty, picked from the O*NET job titles listed under the chosen occupation only. Picking one never
 * changes the occupation.
 */
export function SpecialtyPicker({
  occupation,
  value,
  onChange,
  label = 'Specialty',
}: {
  /** The chosen ESCO code; the picker waits for it. */
  occupation: string
  value: string
  onChange: (specialty: string) => void
  label?: string
}) {
  const [query, setQuery] = useState('')
  // True once the user types; until then the box shows the chosen specialty and the list shows them all.
  const [typing, setTyping] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Data: occupationQuery() → occupationsApi.get → GET /api/occupations/:code → NestjsBE/src/modules/occupations/services/occupations.service.ts occupation()
  const detail = useQuery(occupationQuery(occupation))
  const specialties = detail.data?.specialties ?? []
  const options = filterSpecialties(specialties, typing ? query : '')
  const listed = !value || !detail.data || specialties.includes(value)
  const none = Boolean(detail.data) && specialties.length === 0
  const listShown = open && Boolean(occupation)
  const status = detail.isPending ? 'Loading specialties…'
    : detail.isError ? getErrorMessage(detail.error, 'Specialties are unavailable. Try again.')
    : !options.length ? 'No matching specialty.'
    : `${options.length} ${options.length === 1 ? 'specialty' : 'specialties'} shown`

  function clearBlurTimer() {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
  }

  useEffect(() => clearBlurTimer, [])

  function choose(name: string) {
    onChange(name)
    reset()
  }

  /** Back to showing the chosen specialty, with the list closed. */
  function reset() {
    clearBlurTimer()
    setQuery('')
    setTyping(false)
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="grid content-start gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label} <span className="font-normal text-muted">(optional)</span>
      </label>
      {value ? null : (
        <p id={hintId} className="text-xs text-muted">
          {!occupation ? 'Choose the occupation first' : none ? 'No specialties are listed for this occupation' : 'None chosen'}
        </p>
      )}
      {!listed ? <p id={errorId} className="text-xs text-danger">Not listed under this occupation. Choose a specialty from the list, or clear it.</p> : null}
      {none ? null : (
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={listShown && options.length > 0}
            aria-controls={listShown ? listId : undefined}
            aria-describedby={[value ? null : hintId, listed ? null : errorId].filter(Boolean).join(' ') || undefined}
            aria-invalid={!listed || undefined}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            disabled={!occupation}
            className={cn(value && 'pr-9', value && !typing && 'font-medium', !listed && 'border-danger/60')}
            value={typing ? query : value}
            placeholder={occupation ? 'Search specialties, for example Full Stack' : 'Choose the occupation first'}
            onChange={(event) => { setQuery(event.target.value); setTyping(true); setOpen(true); setActive(0) }}
            onFocus={(event) => { clearBlurTimer(); event.target.select(); setOpen(true) }}
            // While it shows the chosen value, a click selects it all, so typing replaces it.
            onClick={(event) => { if (!typing) event.currentTarget.select() }}
            onBlur={() => { clearBlurTimer(); blurTimerRef.current = setTimeout(reset, 120) }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => Math.max(0, Math.min(i + 1, options.length - 1))) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
              else if (event.key === 'Enter' && open && options[active]) { event.preventDefault(); choose(options[active]) }
              else if (event.key === 'Escape') { if (open || typing) event.preventDefault(); reset() }
            }}
          />
          {value ? (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
              aria-label="Clear specialty" onMouseDown={(event) => event.preventDefault()} onClick={() => { reset(); onChange('') }}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {listShown ? (
            <ul id={listId} role="listbox" aria-label="Specialties" className="menu-drop absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {/* Status rows are not options. The live region inside announces the status and the result count. */}
              <li role="presentation"
                className={cn('px-3 py-2 text-sm', options.length ? 'sr-only' : detail.isError ? 'text-danger' : 'text-muted')}>
                {options.length ? null : <span aria-hidden="true">{status}</span>}
                <LiveStatus text={status} />
              </li>
              {options.map((name, index) => (
                <li key={name} id={`${listId}-${index}`} role="option" aria-selected={index === active}
                  className={cn('cursor-pointer px-3 py-2 text-sm', index === active && 'bg-primary/10')}
                  onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(name)}>
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}
