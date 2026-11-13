'use client'

import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { skillsApi, type DictionarySkill, type FoundSkill } from '@/shared/api/endpoints/users'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui'

const kindLabel: Record<string, string> = { software: 'Tool', knowledge: 'Knowledge', skill: 'Skill' }

export const skillLevels = ['Basic', 'Intermediate', 'Advanced', 'Expert'] as const

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Pick skills from JobAura's skill dictionary only; nothing typed is saved unless it is chosen from the list.
 * Different spellings ("reactjs", "React.js") find the same skill.
 */
export function SkillPicker({
  value,
  onChange,
  field,
  max = 50,
  label = 'Skills',
  placeholder = 'Search skills, for example React or Accounting',
  hideLabel = false,
  suggestions = [],
}: {
  value: string[]
  onChange: (names: string[]) => void
  /** The user's career field; skills from it are listed first. */
  field?: string
  max?: number
  label?: string
  placeholder?: string
  hideLabel?: boolean
  /** Skills found in the user's CV, shown for the user to add one by one. Never added automatically. */
  suggestions?: FoundSkill[]
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const search = useDebounced(query.trim(), 250)
  const listId = useId()
  const inputId = useId()
  const chosen = new Set(value.map((name) => name.toLowerCase()))
  const results = useQuery({
    queryKey: ['skills', 'search', field ?? '', search],
    queryFn: () => skillsApi.search(search, field, 10),
    enabled: search.length > 0,
    staleTime: 300_000,
  })
  const options = (results.data?.content ?? []).filter((skill) => !chosen.has(skill.name.toLowerCase()))
  const full = value.length >= max
  const pending = suggestions.filter((skill) => !chosen.has(skill.name.toLowerCase()))

  function choose(skill: DictionarySkill) {
    onChange(max === 1 ? [skill.name] : [...value, skill.name])
    setQuery('')
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className={cn('text-sm font-semibold', hideLabel && 'sr-only')}>{label}</label>
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Chosen ${label.toLowerCase()}`}>
          {value.map((name) => (
            <li key={name} className="inline-flex items-center gap-1 rounded bg-accent/30 py-0.5 pl-2 pr-1 text-xs font-semibold">
              {name}
              <button type="button" className="rounded p-0.5 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
                aria-label={`Remove ${name}`} onClick={() => onChange(value.filter((item) => item !== name))}>
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {pending.length && !full ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-muted p-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted">Found in your CV. Add the ones that are yours:</p>
            {max > 1 ? (
              <button type="button" className="text-xs font-semibold text-primary hover:underline"
                onClick={() => onChange([...value, ...pending.slice(0, max - value.length).map((skill) => skill.name)])}>
                Add all
              </button>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Skills found in your CV">
            {pending.map((skill) => (
              <li key={skill.id}>
                <button type="button" title={`Written as: ${skill.matched.join(', ')}`}
                  className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs font-semibold hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
                  onClick={() => onChange(max === 1 ? [skill.name] : [...value, skill.name])}>
                  <Plus className="h-3 w-3" />
                  {skill.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {full && max !== 1 ? null : (
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            aria-expanded={open && options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
            autoComplete="off"
            value={query}
            placeholder={max === 1 && value[0] ? 'Search to replace' : placeholder}
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
          {open && search ? (
            <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {results.isFetching && !options.length ? <li className="px-3 py-2 text-sm text-muted">Searching…</li> : null}
              {results.isError ? <li className="px-3 py-2 text-sm text-danger">Skill search is unavailable. Try again.</li> : null}
              {!results.isFetching && !results.isError && !options.length ? (
                <li className="px-3 py-2 text-sm text-muted">No matching skill. Try another spelling.</li>
              ) : null}
              {options.map((skill, index) => (
                <li key={skill.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}
                  className={cn('flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm', index === active && 'bg-primary/10')}
                  onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(skill)}>
                  <span className="min-w-0 truncate">{skill.name}</span>
                  <span className="shrink-0 text-xs text-muted">{kindLabel[skill.kind] ?? skill.kind}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}


/** Skill level from a fixed list, so levels are comparable across profiles. */
export function SkillLevelSelect({
  value,
  onChange,
  hideLabel = false,
}: {
  value?: string | null
  onChange: (level: string) => void
  hideLabel?: boolean
}) {
  const id = useId()
  const listed = skillLevels.find((level) => level.toLowerCase() === (value ?? '').toLowerCase())
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className={cn('text-sm font-semibold', hideLabel && 'sr-only')}>Level</label>
      <select id={id} value={listed ?? value ?? ''} onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-bright/20">
        <option value="">Choose level</option>
        {value && !listed ? <option value={value}>{value} (choose from the list)</option> : null}
        {skillLevels.map((level) => <option key={level} value={level}>{level}</option>)}
      </select>
    </div>
  )
}
