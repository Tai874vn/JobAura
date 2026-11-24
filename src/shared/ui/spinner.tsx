import { cn } from '@/shared/lib/utils'

export function Spinner({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <span
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : 'Loading'}
      aria-hidden={decorative ? true : undefined}
      className={cn('inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent', className)}
    />
  )
}
