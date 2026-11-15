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
    <section id={id} className={cn('py-14 sm:py-16', id && 'scroll-mt-16', sectionTones[tone], className)}>
      <div className={cn('container-page', containerClassName)}>{children}</div>
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">{eyebrow}</div>
        ) : null}
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  onDark = false,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  onDark?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className={cn('text-xs font-bold uppercase tracking-wide', onDark ? 'text-accent' : 'text-primary')}>
            {eyebrow}
          </p>
        ) : null}
        <h2 className={cn('mt-2 font-display text-3xl font-bold', onDark && 'text-white')}>{title}</h2>
        {description ? (
          <p className={cn('mt-2 text-sm leading-6', onDark ? 'text-white/80' : 'text-muted')}>{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
