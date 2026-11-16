'use client'

import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui'
import { occupationQuery } from './api'

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
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listId = useId()
  const inputId = useId()
  const detail = useQuery(occupationQuery(occupation))
  const specialties = detail.data?.specialties ?? []
  const options = filterSpecialties(specialties, query)
  const listed = !value || !detail.data || specialties.includes(value)
  const none = Boolean(detail.data) && specialties.length === 0

  function choose(name: string) {
    onChange(name)
    setQuery('')
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label} <span className="font-normal text-muted">(optional)</span>
      </label>
      {value ? (
        <div className={cn('flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-1.5 text-sm',
          listed ? 'border-border' : 'border-danger/40')}>
          <span className="min-w-0 truncate font-semibold">{value}</span>
          <button type="button" className="rounded p-0.5 text-muted hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
            aria-label="Clear specialty" onClick={() => onChange('')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted">
          {!occupation ? 'Choose your occupation first' : none ? 'No specialties are listed for this occupation' : 'None chosen'}
        </p>
      )}
      {!listed ? <p className="text-xs text-danger">Not listed under this occupation. Choose a specialty from the list, or clear it.</p> : null}
      {none ? null : (
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            disabled={!occupation}
            value={query}
            placeholder={occupation ? 'Search specialties, for example Full Stack' : 'Choose your occupation first'}
            onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
              else if (event.key === 'Enter' && open && options[active]) { event.preventDefault(); choose(options[active]) }
              else if (event.key === 'Escape') setOpen(false)
            }}
          />
          {open && occupation ? (
            <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {detail.isPending ? <li className="px-3 py-2 text-sm text-muted">Loading specialties…</li> : null}
              {detail.isError ? <li className="px-3 py-2 text-sm text-danger">Specialties are unavailable. Try again.</li> : null}
              {detail.data && !options.length ? <li className="px-3 py-2 text-sm text-muted">No matching specialty.</li> : null}
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
