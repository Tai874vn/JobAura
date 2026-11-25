'use server'

import { revalidatePath } from 'next/cache'
import { reportServerRequestFailure, serverRequest } from '@/shared/api/server'
import type { ApiResponse, UserProfile } from '@/shared/schemas'

/**
 * Clears the server cache for `/welcome` and `/jobs` right after an admin creates or removes
 * a marketplace category or subcategory.
 *
 * Verifies the caller's admin role via `/api/auth/me` using their cookies and revalidates only
 * fixed public paths (never a client-supplied path).
 */
export async function refreshMarketplaceTaxonomyPages(): Promise<void> {
  const response = await serverRequest<ApiResponse<UserProfile>>('/api/auth/me')
  if (!response.ok) {
    reportServerRequestFailure(response, 'cache:revalidate-taxonomy', '/api/auth/me')
    return
  }
  if (response.data?.content?.role !== 'admin') return

  revalidatePath('/welcome')
  revalidatePath('/jobs')
}
