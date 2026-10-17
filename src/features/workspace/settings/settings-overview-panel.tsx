'use client'

import { useQuery } from '@tanstack/react-query'
import { calculateProfileCompletion } from '@/features/users/profile-posts'
import type { UserProfile } from '@/shared/schemas'
import { SettingsOverview, type SettingSection } from './setting-sections'
import { settingsResumeOptions } from './settings-resume-query'

export function SettingsOverviewPanel({ profile, onSelect }: {
  profile: UserProfile
  onSelect: (section: SettingSection) => void
}) {
  const resumeQuery = useQuery(settingsResumeOptions(true))
  return <SettingsOverview profile={profile} completion={calculateProfileCompletion(profile)}
    resume={resumeQuery.data?.content ?? null} resumeLoading={resumeQuery.isPending}
    resumeError={resumeQuery.isError} resumeRetrying={resumeQuery.isFetching}
    onRetryResume={() => void resumeQuery.refetch()} onSelect={onSelect} />
}
