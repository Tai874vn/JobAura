import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

export const buttonVariants = cva(
  'interaction relative inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-bright',
        accent: 'bg-accent text-foreground hover:bg-accent/90',
        secondary: 'border border-border bg-surface text-foreground hover:border-primary hover:text-primary',
        ghost: 'text-foreground hover:bg-surface-muted',
        danger: 'border border-danger/25 bg-surface text-danger hover:bg-danger/5',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-5 text-base',
        icon: 'h-10 w-10 px-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }

export type ButtonVariantProps = VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, loading = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || props['aria-busy']}
    >
      {loading ? (
        <>
          <span className="inline-flex items-center justify-center gap-2 opacity-0">{children}</span>
          <span aria-hidden="true" className="absolute h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        </>
      ) : children}
    </button>
  )
}
