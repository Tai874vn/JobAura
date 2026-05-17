import { cn } from '@/shared/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-label="Loading"
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent', className)}
    />
  )
}
