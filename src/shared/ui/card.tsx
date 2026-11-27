/**
 * Shared UI container components (Card, CardHeader, CardContent) that draw a bordered surface box with standard padding.
 *
 * Calls: cn
 * Used by:
 *   - shared/ui/empty-state.tsx
 *   - shared/ui/index.ts
 *   - shared/ui/route-error.tsx
 *   - shared/ui/skeleton.tsx
 */

import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-border bg-surface', className)} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-border p-4', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}
