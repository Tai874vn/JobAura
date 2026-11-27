/**
 * Shared query options for loading the signed-in user's resume on /settings.
 * Polls every 3 seconds while the backend AI seniority evaluation is still running.
 *
 * Calls: usersApi.myResume; queryKeys.myResume; isResumeAiPending
 * Used by:
 *   - features/workspace/components/settings/resume-settings-editor.tsx
 *   - features/workspace/components/settings/settings-page.tsx
 */

import { queryOptions } from '@tanstack/react-query'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'
import { isResumeAiPending } from '@/features/users/utils/resume-ai'

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
