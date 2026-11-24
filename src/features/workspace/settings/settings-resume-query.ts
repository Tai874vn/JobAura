import { queryOptions } from '@tanstack/react-query'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'
import { isResumeAiPending } from '@/features/users/resume-ai'

export function settingsResumeOptions(enabled: boolean, viewerId?: number | null) {
  return queryOptions({
    queryKey: queryKeys.myResume(viewerId),
    queryFn: usersApi.myResume,
    enabled,
    retry: false,
    // While the backend's AI queue works on the resume, check back until it finishes.
    refetchInterval: (query) => (isResumeAiPending(query.state.data?.content) ? 3000 : false),
  })
}
