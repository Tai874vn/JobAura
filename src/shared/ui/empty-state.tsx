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
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  titleAs?: 'h1' | 'h2'
  className?: string
}) {
  const Title = titleAs

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        {icon ? (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </span>
        ) : null}
        <Title className={cn('font-display text-xl font-bold', icon && 'mt-4')}>{title}</Title>
        {description ? <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p> : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
