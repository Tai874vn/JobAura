'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/shared/lib/utils'
import type { UserProfile } from '@/shared/schemas'

export function useProfileUpload(
  mutationFn: (file: File) => Promise<{ content?: UserProfile }>,
  successMessage: string,
  refreshProfile: (next?: UserProfile) => void,
) {
  return useMutation({
    mutationFn,
    onSuccess: (response) => {
      refreshProfile(response.content)
      toast.success(successMessage)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Upload failed')),
  })
}
