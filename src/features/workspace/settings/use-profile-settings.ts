'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints/users'
import { queryKeys } from '@/shared/api/query-keys'
import { setCachedSession } from '@/shared/api/session-cache'
import { cleanObject, toDateInput } from '@/features/users/profile-form-utils'
import { useProfileUpload } from '@/features/users/use-profile-upload'
import { getErrorMessage } from '@/shared/lib/utils'
import type { ProfilePortfolioItem, ProfileSkill, UpdateProfile, UserProfile } from '@/shared/schemas'
import type { PortfolioDraft } from './settings-form-controls'
import { allCertificationProblems, certificationDraft, certificationPayload, type CertificationDraft } from '@/features/users/certifications'

export const emptySkill: Omit<ProfileSkill, 'id'> = { name: '', level: '', sortOrder: 0 }
export { emptyCertificationDraft as emptyCertification } from '@/features/users/certifications'
const emptyPortfolio: PortfolioDraft = { title: '', description: '', image: '', url: '', sortOrder: 0 }

export function useProfileSettings(profile: UserProfile) {
  const client = useQueryClient()
  // Initialize from the already-cached session, not a delayed effect. Background
  // session refetches must not replace fields the member is currently editing.
  const [basic, setBasic] = useState<UpdateProfile>(() => ({
    name: profile.name, phone: profile.phone ?? '', birthDay: toDateInput(profile.birthDay), gender: profile.gender ?? '',
    headline: profile.headline ?? '', bio: profile.bio ?? '', location: profile.location ?? '', website: profile.website ?? '',
    candidateDiscoverable: profile.candidateDiscoverable ?? false,
  }))
  const serverSkills = skillDrafts(profile)
  const [skills, setSkills] = useState<Array<Omit<ProfileSkill, 'id'>>>(serverSkills)
  // The resume edits the same skill list. When it changes there, follow it, unless this list has unsaved edits.
  const [skillsBase, setSkillsBase] = useState(() => JSON.stringify(serverSkills))
  if (JSON.stringify(serverSkills) !== skillsBase) {
    if (JSON.stringify(skills) === skillsBase) setSkills(serverSkills)
    setSkillsBase(JSON.stringify(serverSkills))
  }
  const [certifications, setCertifications] = useState<CertificationDraft[]>(() => (profile.profileCertifications ?? profile.certifications ?? []).map(certificationDraft))
  const [portfolio, setPortfolio] = useState<ProfilePortfolioItem[]>(() => profile.portfolio ?? profile.portfolioItems ?? [])
  const [newPortfolio, setNewPortfolio] = useState<PortfolioDraft>(emptyPortfolio)
  const [pendingPortfolioDelete, setPendingPortfolioDelete] = useState<ProfilePortfolioItem | null>(null)
  const scope = { id: `profile-settings-${profile.id}` }

  function refreshProfile(next?: UserProfile) {
    if (next) setCachedSession(next, client)
    void client.invalidateQueries({ queryKey: queryKeys.me })
  }
  const saveBasic = useMutation({
    scope, mutationFn: () => usersApi.updateMyProfile(cleanObject(basic)),
    onSuccess: (response) => { refreshProfile(response.content); toast.success('Profile updated') },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to update profile')),
  })
  const saveSkills = useMutation({
    scope, mutationFn: () => usersApi.replaceSkills(skills.map((skill, index) => cleanObject({ ...skill, sortOrder: index })).filter((skill) => skill.name)),
    onSuccess: (response) => {
      refreshProfile(response.content)
      // The resume shows the same list and is evaluated again.
      void client.invalidateQueries({ queryKey: queryKeys.myResume })
      toast.success('Skills saved')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save skills')),
  })
  const saveCertifications = useMutation({
    scope, mutationFn: () => {
      const problems = allCertificationProblems(certifications)
      if (problems.length) throw new Error(problems[0])
      return usersApi.replaceCertifications(certificationPayload(certifications))
    },
    onSuccess: (response) => { refreshProfile(response.content); toast.success('Certifications saved') },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save certifications')),
  })
  const createPortfolio = useMutation({
    scope, mutationFn: () => usersApi.createPortfolioItem(cleanObject(newPortfolio)),
    onSuccess: (response) => {
      const savedItems = response.content?.portfolio ?? response.content?.portfolioItems ?? []
      setPortfolio((current) => [...current, ...savedItems.filter((item) => !current.some((existing) => existing.id === item.id))])
      refreshProfile(response.content)
      setNewPortfolio(emptyPortfolio)
      toast.success('Portfolio item created')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to create portfolio item')),
  })
  const updatePortfolio = useMutation({
    scope, mutationFn: (item: ProfilePortfolioItem) => usersApi.updatePortfolioItem(Number(item.id), cleanObject(item)),
    onSuccess: (response) => { refreshProfile(response.content); toast.success('Portfolio item updated') },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to update portfolio item')),
  })
  const deletePortfolio = useMutation({
    scope, mutationFn: usersApi.deletePortfolioItem,
    onSuccess: (_response, id) => {
      setPortfolio((current) => current.filter((item) => item.id !== id))
      refreshProfile(); setPendingPortfolioDelete(null); toast.success('Portfolio item deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete portfolio item')),
  })
  const uploadAvatar = useProfileUpload(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useProfileUpload(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
  const isSaving = saveBasic.isPending || saveSkills.isPending || saveCertifications.isPending || createPortfolio.isPending
    || updatePortfolio.isPending || deletePortfolio.isPending || uploadAvatar.isPending || uploadCover.isPending

  return {
    basic, setBasic, skills, setSkills, certifications, setCertifications, portfolio, setPortfolio, newPortfolio, setNewPortfolio,
    pendingPortfolioDelete, setPendingPortfolioDelete, saveBasic, saveSkills, saveCertifications, createPortfolio, updatePortfolio,
    deletePortfolio, uploadAvatar, uploadCover, isSaving,
  }
}

function skillDrafts(profile: UserProfile): Array<Omit<ProfileSkill, 'id'>> {
  return (profile.profileSkills ?? profile.skills ?? []).map(({ name, level, sortOrder }, index) => ({ name, level: level ?? '', sortOrder: sortOrder ?? index }))
}
