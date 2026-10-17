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
import type { ProfileCertification, ProfilePortfolioItem, ProfileSkill, UpdateProfile, UserProfile } from '@/shared/schemas'
import type { PortfolioDraft } from './settings-form-controls'

export const emptySkill: Omit<ProfileSkill, 'id'> = { name: '', level: '', sortOrder: 0 }
export const emptyCertification: Omit<ProfileCertification, 'id'> = { name: '', issuer: '', issuedAt: '', expiresAt: '', credentialUrl: '', credentialId: '', sortOrder: 0 }
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
  const [skills, setSkills] = useState<Array<Omit<ProfileSkill, 'id'>>>(() => (profile.profileSkills ?? profile.skills ?? []).map(({ name, level, sortOrder }, index) => ({ name, level: level ?? '', sortOrder: sortOrder ?? index })))
  const [certifications, setCertifications] = useState<Array<Omit<ProfileCertification, 'id'>>>(() => (profile.profileCertifications ?? profile.certifications ?? []).map((item, index) => ({
    name: item.name, issuer: item.issuer ?? '', issuedAt: toDateInput(item.issuedAt), expiresAt: toDateInput(item.expiresAt),
    credentialUrl: item.credentialUrl ?? '', credentialId: item.credentialId ?? '', sortOrder: item.sortOrder ?? index,
  })))
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
    onSuccess: (response) => { refreshProfile(response.content); toast.success('Skills saved') },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save skills')),
  })
  const saveCertifications = useMutation({
    scope, mutationFn: () => usersApi.replaceCertifications(certifications.map((cert, index) => cleanObject({ ...cert, sortOrder: index })).filter((cert) => cert.name)),
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
