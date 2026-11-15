'use client'

import { useQuery } from '@tanstack/react-query'
import { calculateProfileCompletion } from '@/features/users/profile-posts'
import type { UserProfile } from '@/shared/schemas'
import { hasResumeSection, SettingsOverview, type SettingSection } from './setting-sections'
import { settingsResumeOptions } from './settings-resume-query'

export function SettingsOverviewPanel({ profile, onSelect }: {
  profile: UserProfile
  onSelect: (section: SettingSection) => void
}) {
  const resumeQuery = useQuery(settingsResumeOptions(hasResumeSection(profile.role)))
  return <SettingsOverview profile={profile} completion={calculateProfileCompletion(profile)}
    resume={resumeQuery.data?.content ?? null} resumeLoading={resumeQuery.isLoading}
    resumeError={resumeQuery.isError} resumeRetrying={resumeQuery.isFetching}
    onRetryResume={() => void resumeQuery.refetch()} onSelect={onSelect} />
}
