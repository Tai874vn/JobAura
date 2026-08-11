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
