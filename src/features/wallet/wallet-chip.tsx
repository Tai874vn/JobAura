'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { credits } from '@/shared/lib/credits'
import { Skeleton } from '@/shared/ui'
import { walletApi, walletKeys } from './api'

/**
 * The balance in the header, for signed-in people only. It is the one lime spot of the design. A skeleton shows
 * while the first read runs, so "0 credits" never flashes (the wallet is made with 5,000 credits on that read).
 * If the read fails the chip is left out rather than showing a wrong number.
 */
export function WalletChip() {
  const { data, isError } = useQuery({ queryKey: walletKeys.summary, queryFn: walletApi.summary, staleTime: 30_000 })
  if (isError) return null
  if (!data) return <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
  return (
    <Link
      href="/wallet"
      aria-label={`Wallet: ${credits(data.available)} available`}
      className="interaction inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-[#d2d92d] px-3 text-sm font-medium text-[#1f2400] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:ring-offset-2"
    >
      {credits(data.available)}
    </Link>
  )
}
