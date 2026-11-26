'use client'

import { settingsConfig } from '@/features/workspace/config/settings'
import { useEffect, useId, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { skillsApi, type DictionarySkill, type FoundSkill } from '@/shared/api/endpoints/users'
import { cn, getErrorMessage } from '@/shared/lib/utils'
import { Input } from '@/shared/ui'

const kindLabel: Record<string, string> = { software: 'Tool', knowledge: 'Knowledge', skill: 'Skill' }

/** Set in src/features/workspace/config/settings.ts */
export const skillLevels = settingsConfig.skillLevels

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
  hideChosen = false,
}: {
  /** The chosen skills are listed by the caller (SkillListEditor), so the picker shows only the search. */
  hideChosen?: boolean
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
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chosen = new Set(value.map((name) => name.toLowerCase()))
  // Data: skillsApi.search → GET /api/skill/search → NestjsBE/src/modules/skill/services/skill.service.ts search()
  const results = useQuery({
    queryKey: ['skills', 'search', field ?? '', search],
    queryFn: () => skillsApi.search(search, field, 10),
    enabled: search.length > 0,
    // Keep previous matches visible while the next debounced search loads so the dropdown does not collapse.
    placeholderData: keepPreviousData,
    staleTime: 300_000,
  })
  const options = (results.data?.content ?? []).filter((skill) => !chosen.has(skill.name.toLowerCase()))
  const full = value.length >= max
  const pending = suggestions.filter((skill) => !chosen.has(skill.name.toLowerCase()))

  function clearBlurTimer() {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current)
      blurTimerRef.current = null
    }
  }

  useEffect(() => clearBlurTimer, [])

  function choose(skill: DictionarySkill) {
    clearBlurTimer()
    onChange(max === 1 ? [skill.name] : [...value, skill.name])
    setQuery('')
    setOpen(false)
    setActive(0)
  }

  return (
    <div className="grid gap-1">
      <label htmlFor={inputId} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>{label}</label>
      {value.length && !hideChosen ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={`Chosen ${label.toLowerCase()}`}>
          {value.map((name) => (
            <li key={name} className="inline-flex items-center gap-1 rounded bg-accent/30 py-0.5 pl-2 pr-1 text-xs font-medium">
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
            <p className="text-xs font-medium text-muted">Found in your CV. Add the ones that are yours:</p>
            {max > 1 ? (
              <button type="button" className="text-xs font-medium text-primary hover:underline"
                onClick={() => onChange([...value, ...pending.slice(0, max - value.length).map((skill) => skill.name)])}>
                Add all
              </button>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="Skills found in your CV">
            {pending.map((skill) => (
              <li key={skill.id}>
                <button type="button" title={`Written as: ${skill.matched.join(', ')}`}
                  className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 text-xs font-medium hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
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
            onFocus={() => { clearBlurTimer(); setOpen(true) }}
            onBlur={() => { clearBlurTimer(); blurTimerRef.current = setTimeout(() => setOpen(false), 120) }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)) }
              else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
              else if (event.key === 'Enter' && open && options[active]) { event.preventDefault(); choose(options[active]) }
              else if (event.key === 'Escape') { if (open && search) event.preventDefault(); setOpen(false) }
            }}
          />
          {open && search ? (
            <ul id={listId} role="listbox" className="menu-drop absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {results.isFetching && !options.length ? <li className="px-3 py-2 text-sm text-muted">Searching…</li> : null}
              {results.isError ? <li className="px-3 py-2 text-sm text-danger">{getErrorMessage(results.error, 'Skill search is unavailable. Try again.')}</li> : null}
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


export type SkillItem = { name: string; level?: string | null }

/**
 * The one skill list, the same in Profile and Resume: a single search to add (with suggestions from the CV), then
 * one compact row per skill with its level and one remove button. `showLevel` is off where levels aren't edited.
 */
export function SkillListEditor<T extends SkillItem>({
  value,
  onChange,
  field,
  suggestions = [],
  showLevel = true,
  max = 50,
}: {
  value: T[]
  onChange: (skills: T[]) => void
  field?: string
  suggestions?: FoundSkill[]
  showLevel?: boolean
  max?: number
}) {
  const names = value.map((skill) => skill.name).filter(Boolean)
  function setNames(next: string[]) {
    // Keep each kept skill (and its level); new names come in without a level.
    const byName = new Map(value.map((skill) => [skill.name.toLowerCase(), skill]))
    onChange(next.map((name) => byName.get(name.toLowerCase()) ?? ({ name, level: '' } as T)))
  }
  return (
    <div className="grid gap-3">
      <SkillPicker hideChosen label="Add a skill" value={names} onChange={setNames} field={field} suggestions={suggestions} max={max} />
      {names.length ? (
        <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Your skills">
          {value.filter((skill) => skill.name).map((skill) => (
            <li key={skill.name} className="flex min-h-12 items-center gap-2 px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{skill.name}</span>
              {showLevel ? (
                <CompactLevelSelect name={skill.name} value={skill.level}
                  onChange={(level) => onChange(value.map((item) => (item === skill ? { ...item, level } : item)))} />
              ) : null}
              <button type="button" aria-label={`Remove ${skill.name}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded text-muted hover:bg-danger/5 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
                onClick={() => onChange(value.filter((item) => item !== skill))}>
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">No skills yet. Search above to add your first one.</p>
      )}
    </div>
  )
}

function CompactLevelSelect({ name, value, onChange }: { name: string; value?: string | null; onChange: (level: string) => void }) {
  const listed = skillLevels.find((level) => level.toLowerCase() === (value ?? '').toLowerCase())
  return (
    <select aria-label={`Level for ${name}`} value={listed ?? value ?? ''} onChange={(event) => onChange(event.target.value)}
      className={cn('h-8 w-32 shrink-0 rounded-md border border-border bg-surface px-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-bright/20 sm:w-36',
        listed ? 'text-foreground' : 'text-muted')}>
      <option value="">Level</option>
      {value && !listed ? <option value={value}>{value}</option> : null}
      {skillLevels.map((level) => <option key={level} value={level}>{level}</option>)}
    </select>
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
      <label htmlFor={id} className={cn('text-sm font-medium', hideLabel && 'sr-only')}>Level</label>
      <select id={id} value={listed ?? value ?? ''} onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-bright/20">
        <option value="">Choose level</option>
        {value && !listed ? <option value={value}>{value} (choose from the list)</option> : null}
        {skillLevels.map((level) => <option key={level} value={level}>{level}</option>)}
      </select>
    </div>
  )
}
