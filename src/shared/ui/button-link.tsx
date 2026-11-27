/**
 * Shared UI link styled as a button, wrapping Next.js Link with the shared button variants and sizes.
 *
 * Calls: buttonVariants; cn
 * Used by:
 *   - shared/ui/index.ts
 *   - shared/ui/route-error.tsx
 */

import Link, { type LinkProps } from 'next/link'
import type { AnchorHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'
import { buttonVariants, type ButtonVariantProps } from './button'

type NativeAnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps>

export type ButtonLinkProps = LinkProps &
  NativeAnchorProps &
  ButtonVariantProps & {
    className?: string
  }

export function ButtonLink({ className, variant, size, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
