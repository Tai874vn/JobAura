import { queryOptions } from '@tanstack/react-query'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'

export function settingsResumeOptions(enabled: boolean) {
  return queryOptions({
    queryKey: queryKeys.myResume,
    queryFn: usersApi.myResume,
    enabled,
    retry: false,
  })
}
