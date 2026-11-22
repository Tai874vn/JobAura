import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { Card, CardContent } from './card'

export function EmptyState({
  icon,
  title,
  description,
  action,
  titleAs = 'h2',
  className,
  fill = false,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  titleAs?: 'h1' | 'h2'
  className?: string
  fill?: boolean
}) {
  const Title = titleAs

  return (
    <Card className={cn(fill && 'flex min-h-64 flex-1 flex-col', className)}>
      <CardContent className={cn('flex flex-col items-center justify-center p-10 text-center', fill && 'flex-1')}>
        {icon ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </span>
        ) : null}
        <Title className={cn('font-display text-xl font-medium', icon && 'mt-4')}>{title}</Title>
        {description ? <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
