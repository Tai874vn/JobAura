'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { settingSections, type SettingSection } from './setting-sections'

export function SettingsNavigation({ active, hrefFor, onSelect }: {
  active: SettingSection
  hrefFor: (section: SettingSection) => string
  onSelect: (section: SettingSection) => void
}) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <nav aria-label="Settings sections" className="flex gap-2 rounded-xl border border-border bg-surface p-2 lg:flex-col">
        {settingSections.slice(0, 3).map((section) => (
          <a key={section.id} href={hrefFor(section.id)} aria-current={active === section.id ? 'page' : undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onSelect(section.id)
            }}
            className={cn('interaction group flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright lg:justify-start lg:px-3',
              active === section.id ? 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 hover:bg-primary/15' : 'text-muted hover:bg-surface-muted hover:text-primary')}>
            <span className="shrink-0 [&_svg]:h-4 [&_svg]:w-4">{section.icon}</span>
            <span className="min-w-0">
              <span className="block">{section.title}</span>
              <span className="mt-0.5 hidden text-xs font-normal text-muted lg:block">{section.description}</span>
            </span>
            <ChevronRight className="ml-auto hidden h-4 w-4 shrink-0 lg:block" aria-hidden="true" />
          </a>
        ))}
      </nav>
      <details className="mt-3 rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted">
        <summary className="cursor-pointer rounded font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">Coming soon</summary>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 lg:grid-cols-1">
          {settingSections.slice(3).map((section) => <li key={section.id} className="flex items-center gap-2"><span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{section.icon}</span>{section.title}</li>)}
        </ul>
      </details>
    </aside>
  )
}
