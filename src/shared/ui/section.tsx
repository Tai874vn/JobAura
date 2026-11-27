/**
 * Shared layout components used across pages. Exports Section, PageHeader, and SectionHeading for consistent page spacing, backgrounds, titles, and action slots.
 *
 * Calls: nothing from this project
 * Used by:
 *   - shared/ui/index.ts
 */

import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

const sectionTones = {
  default: 'bg-background',
  surface: 'bg-surface',
  muted: 'bg-surface-muted',
  primary: 'bg-primary text-white',
}

export function Section({
  id,
  tone = 'default',
  className,
  containerClassName,
  children,
}: {
  id?: string
  tone?: keyof typeof sectionTones
  className?: string
  containerClassName?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn('py-16 sm:py-20', id && 'scroll-mt-16', sectionTones[tone], className)}>
      <div className={cn('container-page', containerClassName)}>{children}</div>
    </section>
  )
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-medium sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  onDark = false,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  onDark?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        <h2 className={cn('font-display text-3xl font-medium', onDark && 'text-white')}>{title}</h2>
        {description ? (
          <p className={cn('mt-2 text-sm leading-6', onDark ? 'text-white/80' : 'text-muted')}>{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
